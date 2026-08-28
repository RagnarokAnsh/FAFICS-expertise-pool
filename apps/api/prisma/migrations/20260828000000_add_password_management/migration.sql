-- Password management support: reset-by-email, change-password, and admin-triggered resets.
--
-- `token_purpose.password_reset` already exists (created in the init migration),
-- so only the notification types and the users column are new here.

-- New notification types so password mails land in notification_logs and stay
-- visible in the admin "failed notifications" view.
-- PostgreSQL 12+ permits ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new label is not *used* in the same transaction. Nothing below uses it.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'password_changed';

-- Records the last time the password was rotated. Displayed in the admin user
-- table so an administrator can see stale credentials at a glance.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ;
