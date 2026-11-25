const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parse a value into a Date. Date-only strings ("2026-06-05") are built from
 * their parts so they resolve to LOCAL midnight — `new Date("2026-06-05")`
 * parses as UTC midnight and can display as the previous day in UTC- zones.
 */
function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The one date format used everywhere (app, emails, Excel): 22 Nov 2026.
 * Unambiguous for an international audience, unlike 11/22/2026 or 22/11/2026.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 24-hour time in the viewer's timezone: 14:05. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 22 Nov 2026, 14:05 in the viewer's timezone. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
}
