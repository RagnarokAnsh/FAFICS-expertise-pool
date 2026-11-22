/**
 * Magic token purposes.
 * Matches the PostgreSQL token_purpose enum and Prisma TokenPurpose.
 *
 * - president_review: 14-day magic link for endorsement (no login required)
 * - email_verification: 24h officer account email verification
 * - password_reset: 1h admin/secretary password reset
 * - applicant_edit: applicant edit/resume link for a draft or returned application
 * - applicant_view: applicant read-only view of their submitted application
 */
export enum TokenPurpose {
  PRESIDENT_REVIEW = 'president_review',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  APPLICANT_EDIT = 'applicant_edit',
  APPLICANT_VIEW = 'applicant_view',
}
