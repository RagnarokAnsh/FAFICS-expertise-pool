/**
 * Application lifecycle statuses.
 * Matches the PostgreSQL application_status enum and Prisma ApplicationStatus.
 */
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  CHANGES_REQUESTED = 'changes_requested',
  ENDORSED = 'endorsed',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}
