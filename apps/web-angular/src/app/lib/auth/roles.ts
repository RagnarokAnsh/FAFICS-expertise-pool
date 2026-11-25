import Cookies from 'js-cookie';

/**
 * Officer roles and what each may do — the UI copy of the API's rules in
 * fafics-backend/src/modules/auth/roles.ts. This only decides what to SHOW;
 * the API enforces every permission on its own, so keep the two in step.
 */

/**
 * Roles an administrator can assign in User Management. The API also knows
 * Secretary and Committee; they are not offered yet — uncomment to enable.
 */
export const ROLE_OPTIONS: readonly { value: string; label: string; description: string }[] = [
  {
    value: 'management',
    label: 'Management',
    description:
      'View only: dashboard, applications, expertise pool and expiring profiles, plus Excel exports. Cannot change anything or manage users.',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full access: reviews applications, sends reminders, exports data and manages users.',
  },
  // {
  //   value: 'secretary',
  //   label: 'Secretary',
  //   description: 'Reviews applications (approve, reject, return, notes), sends reminders and exports data.',
  // },
  // {
  //   value: 'committee',
  //   label: 'Committee',
  //   description: 'View only: dashboard, applications and expertise pool.',
  // },
];

/** Display names for every role an account can hold, offered or not. */
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  management: 'Management',
  secretary: 'Secretary',
  committee: 'Committee',
};

const REVIEW_ROLES = ['admin', 'secretary'];
const EXPORT_ROLES = ['admin', 'secretary', 'management'];
const EXPIRING_VIEW_ROLES = ['admin', 'secretary', 'management'];

/** The role hint stored at sign-in (the session itself is an HttpOnly cookie). */
export function currentRole(): string | null {
  return Cookies.get('fafics_role') ?? null;
}

export const canReview = (role: string | null): boolean => !!role && REVIEW_ROLES.includes(role);
export const canExport = (role: string | null): boolean => !!role && EXPORT_ROLES.includes(role);
export const canViewExpiring = (role: string | null): boolean => !!role && EXPIRING_VIEW_ROLES.includes(role);
export const isAdmin = (role: string | null): boolean => role === 'admin';

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[role ?? ''] ?? role ?? 'Officer';
}
