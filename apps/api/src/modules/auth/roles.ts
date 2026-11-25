import { UserRole } from '@fafics/shared';

/**
 * Who may do what in the officer dashboard. Controllers reference these lists
 * in @Roles(...) so a permission change is made in one place.
 *
 *  - admin       everything, including user management
 *  - secretary   reviews applications (approve / reject / return / notes),
 *                exports, reminders, notification log
 *  - committee   read-only: dashboard, applications, reports
 *  - management  read-only: everything committee sees plus expiring profiles,
 *                and the Excel exports. Cannot change anything and has no
 *                user management (ADMIN_ROLES is admin only).
 *
 * Members (applicants) and presidents have no password and cannot sign in.
 */

/** Roles an administrator can assign in User Management. */
export const OFFICER_ROLES = [
  UserRole.ADMIN,
  UserRole.SECRETARY,
  UserRole.COMMITTEE,
  UserRole.MANAGEMENT,
] as const;

/** Read the dashboard, application list and detail, analytics. */
export const VIEW_ROLES = [...OFFICER_ROLES];

/** Read the expiring-profiles list. */
export const EXPIRING_VIEW_ROLES = [UserRole.ADMIN, UserRole.SECRETARY, UserRole.MANAGEMENT];

/** Change application state, add notes, send reminders, notification log. */
export const REVIEW_ROLES = [UserRole.ADMIN, UserRole.SECRETARY];

/** Download Excel exports (full pool and single application). */
export const EXPORT_ROLES = [UserRole.ADMIN, UserRole.SECRETARY, UserRole.MANAGEMENT];

/** User management — administrators only. */
export const ADMIN_ROLES = [UserRole.ADMIN];

export function isOfficerRole(role: unknown): boolean {
  return (OFFICER_ROLES as readonly string[]).includes(role as string);
}
