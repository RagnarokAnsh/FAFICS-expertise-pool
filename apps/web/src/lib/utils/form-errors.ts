/**
 * Walk react-hook-form's nested errors object and return the first
 * human-readable message found, so validation toasts can be specific.
 */
export function firstErrorMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  const obj = errors as Record<string, unknown>;
  if (typeof obj.message === 'string' && obj.message) return obj.message;
  for (const value of Object.values(obj)) {
    // Skip refs/DOM nodes RHF attaches to field errors.
    if (!value || typeof value !== 'object') continue;
    if (typeof Element !== 'undefined' && value instanceof Element) continue;
    const found = firstErrorMessage(value);
    if (found) return found;
  }
  return null;
}
