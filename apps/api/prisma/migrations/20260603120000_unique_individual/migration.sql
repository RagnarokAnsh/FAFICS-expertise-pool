-- Enforce "one application record per individual" (ToR requirement).
--
-- Identity = email + member association. A User is already unique by email, so
-- the application-level key is (user_id, association_id). These are raw partial/
-- functional unique indexes that Prisma cannot express (same pattern as
-- uidx_expertise_fixed_area in custom-objects.sql).

-- One association per (name, country) — trimmed + case-insensitive — so the same
-- real-world association cannot fork into multiple rows and corrupt the key.
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_association_name_country"
  ON "associations" (lower(trim(name)), lower(trim(country)));

-- At most one ACTIVE application per individual + association. Terminal states
-- (rejected/expired) are excluded, so a fresh record may begin a new cycle only
-- after the previous one has ended.
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_application_active_user_assoc"
  ON "applications" ("user_id", "association_id")
  WHERE status NOT IN ('rejected', 'expired');
