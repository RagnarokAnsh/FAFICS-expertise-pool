import { Transform } from 'class-transformer';

/** Trims a string value, so pasted values with stray spaces still match. */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and upper-cases a string value (reference numbers are stored as EP-0001). */
export const TrimUpper = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));
