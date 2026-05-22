/**
 * Converts a numeric duration in years to a human-readable string.
 * The sentinel value 99.0 maps to "30+ years" per the schema convention.
 *
 * @param years - Duration in years (0.5, 1, 2.5, ... 30, 99)
 * @returns Human-readable duration string
 */
export function formatDuration(years: number): string {
  if (years === 99 || years === 99.0) {
    return '30+ years';
  }
  if (years === 1) {
    return '1 year';
  }
  if (years === 0.5) {
    return '6 months';
  }
  return `${years} years`;
}
