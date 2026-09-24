import type { ZodType } from 'zod';
import { get, set } from './rhf-utils';

/**
 * Port of @hookform/resolvers 5.4 `zodResolver` (zod v4 branch) and its
 * `toNestErrors`, so a failed parse produces the same nested error object the
 * Next.js app shows — same messages, same `.root` placement, same key order.
 */

interface FlatError {
  message: string;
  type: string;
  ref?: unknown;
}

function parseZod4Issues(issues: any[]): Record<string, FlatError> {
  const errors: Record<string, FlatError> = {};
  const queue = [...issues];
  while (queue.length) {
    const issue = queue[0];
    const { code, message } = issue;
    const path = issue.path.join('.');
    if (!errors[path]) {
      if (code === 'invalid_union' && issue.errors.length > 0) {
        const unionError = issue.errors[0][0];
        errors[path] = { message: unionError.message, type: unionError.code };
      } else {
        errors[path] = { message, type: code };
      }
    }
    if (code === 'invalid_union') {
      issue.errors.forEach((unionErrors: any[]) =>
        unionErrors.forEach((e) => queue.push({ ...e, path: [...issue.path, ...e.path] })),
      );
    }
    queue.shift();
  }
  return errors;
}

const stripBrackets = (name: string) => name.replace(/[\[\]]/g, '');

function isNameInFieldArray(names: string[], name: string) {
  const path = stripBrackets(name).replace(/[.*+?^${}()|\\]/g, '\\$&');
  return names.some((n) => stripBrackets(n).match(`^${path}\\.\\d+`));
}

function toNestErrors(errors: Record<string, FlatError>, names: string[], fields: any) {
  const fieldErrors: Record<string, any> = {};
  for (const path in errors) {
    const field = get(fields, path);
    const error = Object.assign(errors[path] || {}, { ref: field && field.ref });
    // react-hook-form always passes an array here (possibly empty), so the
    // `|| Object.keys(errors)` fallback in the original never applies.
    if (isNameInFieldArray(names, path)) {
      const fieldArrayErrors = Object.assign({}, get(fieldErrors, path));
      set(fieldArrayErrors, 'root', error);
      set(fieldErrors, path, fieldArrayErrors);
    } else {
      set(fieldErrors, path, error);
    }
  }
  return fieldErrors;
}

export interface ResolverResult {
  values: any;
  errors: Record<string, any>;
}

/**
 * Validate `values` against `schema`. `names` are the field names being
 * validated (react-hook-form passes the triggered names, or every mounted
 * field on submit); `fields` is the registered-field tree used for `ref`s.
 */
export function resolve(schema: ZodType, values: unknown, names: string[], fields: any): ResolverResult {
  // In apps/web, @hookform/resolvers imports `zod/v4/core` from the root
  // node_modules (the v4 core bundled with zod 3.25), not the app's zod 4.4.3.
  // That copy has no locale loaded, so every issue WITHOUT a schema message
  // (e.g. z.string() given undefined) reads just "Invalid input", not
  // "Invalid input: expected string, received undefined". This per-parse error
  // map sits below schema-level messages, so it reproduces that exactly.
  const result = schema.safeParse(values, { error: () => 'Invalid input' });
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  return { values: {}, errors: toNestErrors(parseZod4Issues(result.error.issues), names, fields) };
}
