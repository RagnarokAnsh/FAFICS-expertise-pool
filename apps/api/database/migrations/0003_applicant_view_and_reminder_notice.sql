-- =============================================================================
-- 0003 — Enum values for the November 2026 features.
--
--  * applicant_view (token purpose) + applicant_view_link (email): the
--    read-only link that lets an applicant view their submitted application.
--  * president_reminder_applicant_notice (email): tells the applicant when
--    their President is reminded to endorse.
--
-- Same values as the old Prisma migrations 20261122000000_add_applicant_view_link
-- and 20261125000000_add_applicant_reminder_notice, so a database that already
-- has them (a development copy) is left unchanged.
-- =============================================================================

ALTER TYPE token_purpose ADD VALUE IF NOT EXISTS 'applicant_view';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'applicant_view_link';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'president_reminder_applicant_notice';
