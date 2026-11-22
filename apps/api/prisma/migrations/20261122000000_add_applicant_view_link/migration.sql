-- Read-only link that lets an applicant view their submitted application.
-- AlterEnum
ALTER TYPE "token_purpose" ADD VALUE 'applicant_view';

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'applicant_view_link';
