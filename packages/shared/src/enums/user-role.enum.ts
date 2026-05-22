/**
 * System user roles for RBAC.
 * Matches the PostgreSQL user_role enum and Prisma UserRole.
 *
 * - member: applicant — no dashboard login; tracks via email + ref number
 * - president: association president — endorses via magic link (no account)
 * - secretary: FAFICS secretary — full review + approve/reject
 * - committee: succession planning committee — view-only dashboard access
 * - admin: system admin — full access including user management
 */
export enum UserRole {
  MEMBER = 'member',
  PRESIDENT = 'president',
  SECRETARY = 'secretary',
  COMMITTEE = 'committee',
  ADMIN = 'admin',
}
