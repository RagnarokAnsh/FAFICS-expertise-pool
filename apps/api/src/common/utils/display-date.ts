/**
 * The one date format used everywhere people read dates (app, emails, Excel):
 * "22 Nov 2026". Unambiguous for an international audience, unlike 11/22/2026
 * or 22/11/2026. Uses the UTC calendar day, which is how dates are stored.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDisplayDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "22 Nov 2026, 14:05 UTC" for moments in time (e.g. a password change). */
export function formatDisplayDateTime(value: Date): string {
  const hh = String(value.getUTCHours()).padStart(2, '0');
  const mm = String(value.getUTCMinutes()).padStart(2, '0');
  return `${formatDisplayDate(value)}, ${hh}:${mm} UTC`;
}
