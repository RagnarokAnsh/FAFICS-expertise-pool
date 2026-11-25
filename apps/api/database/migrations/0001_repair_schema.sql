-- =============================================================================
-- 0001 — Repair the schema left behind by the failed Prisma migration run.
--
-- On the production database Prisma's 20260604000000_apply_custom_objects
-- migration failed ("function unaccent(text) does not exist" while building
-- idx_applications_fts), and Prisma refuses to run anything after a failed
-- migration. As a result the database is missing:
--   * fn_generate_reference_number / fn_generate_uid (+ their sequences), so
--     every application submission fails;
--   * fn_expire_applications, so the daily expiry job fails;
--   * the updated_at and max-3-preferred-areas triggers;
--   * the columns/enum values from every later migration (position preference,
--     competencies, FAFICS "other", password management).
--
-- Prisma has been removed from the backend, so this file (applied by
-- scripts/migrate.js) replaces those migrations. Every statement is idempotent,
-- so it is safe on the broken database, on one that was partly fixed by hand,
-- and on a fresh database built from faficsdb.sql.
--
-- Run it as the OWNER of the tables (ALTER TYPE / ALTER TABLE / CREATE TRIGGER
-- require ownership). Needs PostgreSQL 12 or later.
-- =============================================================================

-- ─── Columns and enum values from the migrations that never ran ─────────────
-- 20260618000000_add_position_preference
ALTER TABLE applications ADD COLUMN IF NOT EXISTS preferred_committees TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS position_preference_rationale TEXT;
-- 20260619000000_add_competencies_and_fafics_other
ALTER TABLE application_fafics_experiences ALTER COLUMN area_of_contribution TYPE TEXT;
ALTER TABLE application_fafics_experiences ADD COLUMN IF NOT EXISTS area_of_contribution_other TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS competencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- 20260620000000_add_preferred_committees_other
ALTER TABLE applications ADD COLUMN IF NOT EXISTS preferred_committees_other TEXT;
-- 20260828000000_add_password_management
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'password_changed';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- ─── Sequences ──────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS application_ref_seq START 1 INCREMENT 1 NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS application_uid_seq START 1 INCREMENT 1 NO MAXVALUE CACHE 1;

-- If numbers were ever issued (e.g. by hand), continue after the highest one
-- instead of colliding with the unique indexes on reference_number/uid_number.
SELECT setval('application_ref_seq', m, true)
FROM (
  SELECT MAX(NULLIF(regexp_replace(reference_number, '\D', '', 'g'), '')::BIGINT) AS m
  FROM applications
) s
WHERE m IS NOT NULL AND m >= (SELECT last_value FROM application_ref_seq);

SELECT setval('application_uid_seq', m, true)
FROM (
  SELECT MAX(NULLIF(regexp_replace(uid_number, '\D', '', 'g'), '')::BIGINT) AS m
  FROM applications
) s
WHERE m IS NOT NULL AND m >= (SELECT last_value FROM application_uid_seq);

-- ─── Reference number / UID generators ──────────────────────────────────────
-- SECURITY DEFINER: they run with the owner's rights, so the API's database
-- user can issue numbers even when a different (owner) account ran this file
-- and owns the sequences. search_path is pinned, as SECURITY DEFINER requires.
CREATE OR REPLACE FUNCTION fn_generate_reference_number()
RETURNS VARCHAR(20)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN 'EP-' || LPAD(NEXTVAL('application_ref_seq')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION fn_generate_uid()
RETURNS VARCHAR(20)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN LPAD(NEXTVAL('application_uid_seq')::TEXT, 4, '0');
END;
$$;

-- ─── Expire applications (daily maintenance job) ────────────────────────────
-- Audits exactly the rows this call expired (RETURNING), rather than guessing
-- from updated_at, so a manual status change in the same minute is not
-- mislabelled as an automatic expiry.
CREATE OR REPLACE FUNCTION fn_expire_applications()
RETURNS INTEGER AS $$
DECLARE affected INTEGER;
BEGIN
  WITH expired AS (
    UPDATE applications
    SET    status = 'expired', updated_at = NOW()
    WHERE  status = 'approved' AND expires_at < CURRENT_DATE
    RETURNING id
  )
  INSERT INTO audit_logs (application_id, actor_email, actor_role, action, old_status, new_status, metadata)
  SELECT id, 'system@fafics.org', 'admin', 'system.expiry_run', 'approved', 'expired',
         jsonb_build_object('reason', 'automatic_expiry', 'expired_at', NOW())
  FROM expired;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ─── Max 3 preferred expertise areas ────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_max_preferred_areas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_preferred = true THEN
    IF (
      SELECT COUNT(*) FROM application_expertise
      WHERE  application_id = NEW.application_id
        AND  is_preferred   = true
        AND  id            <> COALESCE(NEW.id, gen_random_uuid())
    ) >= 3 THEN
      RAISE EXCEPTION 'An application may have at most 3 preferred expertise areas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_preferred_areas ON application_expertise;
CREATE TRIGGER trg_max_preferred_areas
  BEFORE INSERT OR UPDATE ON application_expertise
  FOR EACH ROW EXECUTE FUNCTION check_max_preferred_areas();

-- ─── updated_at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_associations_updated_at ON associations;
CREATE TRIGGER trg_associations_updated_at
  BEFORE UPDATE ON associations FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─── Data-integrity indexes ─────────────────────────────────────────────────
-- Existing duplicate rows would make a unique index fail and abort the whole
-- file; skip that one index with a NOTICE instead (the app works without it).
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_expertise_fixed_area
    ON application_expertise (application_id, area_key)
    WHERE is_custom = false;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Skipped uidx_expertise_fixed_area: duplicate rows exist (%). Remove them, then create the index by hand.', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_association_name_country
    ON associations (lower(trim(name)), lower(trim(country)));
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Skipped uidx_association_name_country: duplicate rows exist (%).', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_application_active_user_assoc
    ON applications (user_id, association_id)
    WHERE status NOT IN ('rejected', 'expired');
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Skipped uidx_application_active_user_assoc: duplicate rows exist (%).', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_expires_approved ON applications(expires_at)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_expertise_preferred ON application_expertise(application_id)
  WHERE is_preferred = true;

CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires_unused ON magic_tokens(expires_at)
  WHERE used_at IS NULL;

-- ─── Optional search indexes ────────────────────────────────────────────────
-- Performance only: the application's search does not use them. They need the
-- pg_trgm / unaccent extensions, which some hosts do not let the database user
-- install — then they are skipped with a NOTICE instead of failing the file.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_applications_name_trgm ON applications
    USING gin((first_name || ' ' || last_name) gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped optional trigram search index (%).', SQLERRM;
END $$;

-- This is what broke the Prisma run: an unqualified unaccent() cannot be
-- resolved while the index is built. Schema-qualifying both the function and
-- its dictionary makes it independent of search_path.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $fn$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $fn$;
  CREATE INDEX IF NOT EXISTS idx_applications_fts ON applications USING gin(
    to_tsvector('english',
      immutable_unaccent(first_name || ' ' || last_name || ' ' ||
                         association_name || ' ' || association_country)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped optional full-text search index (%).', SQLERRM;
END $$;
