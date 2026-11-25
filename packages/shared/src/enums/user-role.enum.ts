/**
 * System user roles for RBAC.
 * Matches the PostgreSQL user_role enum.
 *
 * - member: applicant — no dashboard login; tracks via email + ref number
 * - president: association president — endorses via magic link (no account)
 * - secretary: FAFICS secretary — full review + approve/reject
 * - committee: succession planning committee — view-only dashboard access
 * - admin: system admin — full access including user management
 * - management: view-only dashboard access (incl. expiring profiles) + Excel exports; no user management
 */
export enum UserRole {
  MEMBER = 'member',
  PRESIDENT = 'president',
  SECRETARY = 'secretary',
  COMMITTEE = 'committee',
  ADMIN = 'admin',
  MANAGEMENT = 'management',
}
