/**
 * Magic token purposes.
 * Matches the PostgreSQL token_purpose enum and Prisma TokenPurpose.
 *
 * - president_review: 14-day magic link for endorsement (no login required)
 * - email_verification: 24h officer account email verification
 * - password_reset: 1h admin/secretary password reset
 */
export enum TokenPurpose {
  PRESIDENT_REVIEW = 'president_review',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}
