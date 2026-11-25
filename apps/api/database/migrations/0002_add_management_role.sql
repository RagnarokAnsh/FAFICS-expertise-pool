-- =============================================================================
-- 0002 — Add the 'management' role: a read-only dashboard account.
--
-- Management users can sign in, view the dashboard, applications, the
-- expertise pool, expiring profiles and reports, and download the Excel
-- exports, but cannot change anything (no approve/reject/return, notes,
-- reminders or user management).
-- The permissions themselves live in the API (see src/modules/auth/roles.ts).
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'management';
