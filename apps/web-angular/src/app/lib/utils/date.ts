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

/** App-wide display format for dates: MM/DD/YYYY. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/** MM/DD/YYYY, h:mm AM/PM in the viewer's local timezone. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d)}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}
