-- =============================================================================
-- Custom PostgreSQL objects that Prisma cannot express in schema.prisma:
-- extensions, sequences, functions (reference/UID generators, expiry,
-- updated_at), triggers, partial/functional unique indexes, search indexes,
-- and reporting views.
--
-- This migration folds in what used to be the manually-applied
-- `prisma/custom-objects.sql`, so a plain `prisma migrate deploy` provisions a
-- fully working database with no extra steps. Every statement is idempotent
-- (CREATE OR REPLACE / IF NOT EXISTS / DROP ... IF EXISTS), so it is safe to run
-- on a fresh database and to re-run on one where these objects already exist.
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Sequences ──────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS application_ref_seq
  START 1 INCREMENT 1 NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS application_uid_seq
  START 1 INCREMENT 1 NO MAXVALUE CACHE 1;

-- ─── Reference Number Generator ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_reference_number()
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN 'EP-' || LPAD(NEXTVAL('application_ref_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generate_reference_number() IS
  'Call inside your submission transaction. Returns EP-0001, EP-0002, etc.';

-- ─── UID Generator ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_uid()
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN LPAD(NEXTVAL('application_uid_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generate_uid() IS
  'System-assigned UID. Called alongside fn_generate_reference_number() at submission.';

-- ─── Expire Applications ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_expire_applications()
RETURNS INTEGER AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE applications
  SET    status     = 'expired',
         updated_at = NOW()
  WHERE  status     = 'approved'
    AND  expires_at < CURRENT_DATE;

  GET DIAGNOSTICS affected = ROW_COUNT;

  INSERT INTO audit_logs (
    application_id, actor_email, actor_role,
    action, old_status, new_status, metadata
  )
  SELECT
    id, 'system@fafics.org', 'admin',
    'system.expiry_run', 'approved', 'expired',
    jsonb_build_object('reason', 'automatic_expiry', 'expired_at', NOW())
  FROM applications
  WHERE status     = 'expired'
    AND updated_at >= NOW() - INTERVAL '1 minute';

  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ─── Max Preferred Areas Trigger ────────────────────────────────────────────
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

-- ─── Updated At Trigger ─────────────────────────────────────────────────────
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

-- ─── Partial Unique Index for Fixed Expertise Areas ─────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uidx_expertise_fixed_area
  ON application_expertise (application_id, area_key)
  WHERE is_custom = false;

-- ─── One application record per individual (email + association) ─────────────
-- Association identity: one row per (name, country), trimmed + case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_association_name_country
  ON associations (lower(trim(name)), lower(trim(country)));

-- At most one ACTIVE application per individual + association. Terminal states
-- (rejected/expired) are excluded so a new cycle can start after them.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_application_active_user_assoc
  ON applications (user_id, association_id)
  WHERE status NOT IN ('rejected', 'expired');

-- ─── Immutable Unaccent Wrapper (required for index expressions) ────────────
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- ─── Full-Text Search Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_fts ON applications USING gin(
  to_tsvector('english',
    immutable_unaccent(first_name || ' ' || last_name || ' ' ||
             association_name || ' ' || association_country)
  )
);

-- ─── Trigram Index for Fuzzy Name Search ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_name_trgm ON applications
  USING gin((first_name || ' ' || last_name) gin_trgm_ops);

-- ─── Conditional Index for Approved Expiring Applications ───────────────────
CREATE INDEX IF NOT EXISTS idx_applications_expires_approved ON applications(expires_at)
  WHERE status = 'approved';

-- ─── Preferred Expertise Index ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expertise_preferred ON application_expertise(application_id)
  WHERE is_preferred = true;

-- ─── Token Expiry Index ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires_unused ON magic_tokens(expires_at)
  WHERE used_at IS NULL;

-- ─── Views ──────────────────────────────────────────────────────────────────

-- Active roster view (secretary + committee read access)
CREATE OR REPLACE VIEW vw_active_roster AS
SELECT
  a.id, a.reference_number, a.uid_number,
  a.first_name, a.last_name, a.nationality, a.second_nationality,
  a.gender, a.email, a.phone,
  a.association_name, a.association_country,
  a.separation_date, a.approved_at, a.expires_at,
  ARRAY(
    SELECT ae.area_label FROM application_expertise ae
    WHERE  ae.application_id = a.id AND ae.is_preferred = true
    ORDER  BY ae.sort_order
  ) AS preferred_areas,
  ARRAY(
    SELECT al.language || ' (' || al.proficiency || ')'
    FROM   application_languages al
    WHERE  al.application_id = a.id
    ORDER  BY al.sort_order
  ) AS languages,
  ARRAY(
    SELECT ae.area_label FROM application_expertise ae
    WHERE  ae.application_id = a.id AND ae.expertise_level = 'expert'
    ORDER  BY ae.sort_order
  ) AS expert_areas
FROM applications a
WHERE a.status = 'approved';

-- Dashboard stats view
CREATE OR REPLACE VIEW vw_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'submitted')         AS pending_endorsement,
  COUNT(*) FILTER (WHERE status = 'endorsed')          AS pending_review,
  COUNT(*) FILTER (WHERE status = 'under_review')      AS under_review,
  COUNT(*) FILTER (WHERE status = 'approved')          AS active_in_pool,
  COUNT(*) FILTER (WHERE status = 'changes_requested') AS changes_requested,
  COUNT(*) FILTER (WHERE status = 'rejected')          AS rejected,
  COUNT(*) FILTER (WHERE status = 'expired')           AS expired,
  COUNT(*) FILTER (WHERE status = 'draft')             AS drafts,
  COUNT(*) FILTER (
    WHERE status    = 'approved'
      AND expires_at BETWEEN CURRENT_DATE
                         AND CURRENT_DATE + INTERVAL '90 days'
  ) AS expiring_in_90_days
FROM applications;
