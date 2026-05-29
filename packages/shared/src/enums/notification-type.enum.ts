/**
 * Email notification types logged in the notification_logs table.
 * Matches the PostgreSQL notification_type enum and Prisma NotificationType.
 */
export enum NotificationType {
  SUBMISSION_CONFIRMATION = 'submission_confirmation',
  PRESIDENT_REVIEW_REQUEST = 'president_review_request',
  PRESIDENT_LINK_EXPIRED = 'president_link_expired',
  CHANGES_REQUESTED = 'changes_requested',
  ENDORSED = 'endorsed',
  SECRETARY_REVIEW_PENDING = 'secretary_review_pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RENEWAL_REMINDER_90D = 'renewal_reminder_90d',
  RENEWAL_REMINDER_30D = 'renewal_reminder_30d',
  EXPIRED = 'expired',
  APPLICANT_EDIT_LINK = 'applicant_edit_link',
  DRAFT_SAVED_LINK = 'draft_saved_link',
}
