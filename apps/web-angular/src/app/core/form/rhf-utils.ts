/**
 * Path / object helpers ported from react-hook-form 7.76 (the version the
 * Next.js app uses). They are copied rather than re-invented so values and
 * error objects end up with exactly the same shape — including key order,
 * which decides which message a validation toast shows first.
 */

export const isNullOrUndefined = (value: unknown): value is null | undefined => value == null;
export const isUndefined = (value: unknown): value is undefined => value === undefined;
export const isDateObject = (value: unknown): value is Date => value instanceof Date;
const isObjectType = (value: unknown) => typeof value === 'object';

export const isObject = (value: unknown): value is Record<string, any> =>
  !isNullOrUndefined(value) && !Array.isArray(value) && isObjectType(value) && !isDateObject(value);

export const isPrimitive = (value: unknown) => isNullOrUndefined(value) || !isObjectType(value);
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isKey = (value: string) => /^\w*$/.test(value);
export const compact = <T>(value: T[] | unknown): T[] => (Array.isArray(value) ? value.filter(Boolean) : []);
export const stringToPath = (input: string): string[] =>
  compact<string>(input.replace(/["|']|\]/g, '').split(/\.|\[/));
export const convertToArrayPayload = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);
export const isEmptyObject = (value: unknown) => isObject(value) && !Object.keys(value).length;

export function get(object: any, path?: string | null, defaultValue?: unknown): any {
  if (!path || !isObject(object)) {
    return defaultValue;
  }
  const paths = isKey(path) ? [path] : stringToPath(path);
  const result = paths.reduce<any>(
    (acc, key) => (isNullOrUndefined(acc) ? undefined : acc[key]),
    object,
  );
  return isUndefined(result) || result === object
    ? isUndefined(object[path])
      ? defaultValue
      : object[path]
    : result;
}

export function set(object: any, path: string, value?: unknown): void {
  let index = -1;
  const tempPath = isKey(path) ? [path] : stringToPath(path);
  const length = tempPath.length;
  const lastIndex = length - 1;
  while (++index < length) {
    const key = tempPath[index];
    let newValue: unknown = value;
    if (index !== lastIndex) {
      const objValue = object[key];
      newValue =
        isObject(objValue) || Array.isArray(objValue)
          ? objValue
          : !isNaN(+tempPath[index + 1])
            ? []
            : {};
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    object[key] = newValue;
    object = object[key];
  }
}

function baseGet(object: any, updatePath: (string | number)[]) {
  const length = updatePath.slice(0, -1).length;
  let index = 0;
  while (index < length) {
    if (isNullOrUndefined(object)) {
      object = undefined;
      break;
    }
    object = object[updatePath[index]];
    index++;
  }
  return object;
}

function isEmptyArray(obj: unknown[]) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !isUndefined(obj[key as any])) {
      return false;
    }
  }
  return true;
}

export function unset(object: any, path: string | (string | number)[]): any {
  if (isString(path) && Object.prototype.hasOwnProperty.call(object, path)) {
    delete object[path];
    return object;
  }
  const paths = Array.isArray(path) ? path : isKey(path) ? [path] : stringToPath(path);
  const childObject = paths.length === 1 ? object : baseGet(object, paths);
  const index = paths.length - 1;
  const key = paths[index];
  if (childObject) {
    delete childObject[key];
  }
  if (
    index !== 0 &&
    ((isObject(childObject) && isEmptyObject(childObject)) ||
      (Array.isArray(childObject) && isEmptyArray(childObject)))
  ) {
    unset(object, paths.slice(0, -1));
  }
  return object;
}

export const unsetEmptyArray = (ref: any, name: string) => !compact(get(ref, name)).length && unset(ref, name);

const isPlainObject = (tempObject: any) => {
  const prototypeCopy = tempObject.constructor && tempObject.constructor.prototype;
  return isObject(prototypeCopy) && Object.prototype.hasOwnProperty.call(prototypeCopy, 'isPrototypeOf');
};

export function cloneObject<T>(data: T): T {
  if (data instanceof Date) {
    return new Date(data) as T;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return data;
  }
  const isArray = Array.isArray(data);
  if (!isArray && !(isObject(data) && isPlainObject(data))) {
    return data;
  }
  const copy: any = isArray ? [] : Object.create(Object.getPrototypeOf(data));
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      copy[key] = cloneObject((data as any)[key]);
    }
  }
  return copy;
}

export function deepEqual(object1: any, object2: any, visited = new WeakSet<object>()): boolean {
  if (object1 === object2) {
    return true;
  }
  if (isPrimitive(object1) || isPrimitive(object2)) {
    return Object.is(object1, object2);
  }
  if (isDateObject(object1) && isDateObject(object2)) {
    return Object.is(object1.getTime(), object2.getTime());
  }
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  if (visited.has(object1) || visited.has(object2)) {
    return true;
  }
  visited.add(object1);
  visited.add(object2);
  for (const key of keys1) {
    const val1 = object1[key];
    if (!(key in object2)) {
      return false;
    }
    if (key !== 'ref') {
      const val2 = object2[key];
      if (
        (isDateObject(val1) && isDateObject(val2)) ||
        ((isObject(val1) || Array.isArray(val1)) && (isObject(val2) || Array.isArray(val2)))
          ? !deepEqual(val1, val2, visited)
          : !Object.is(val1, val2)
      ) {
        return false;
      }
    }
  }
  return true;
}

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const d = typeof performance === 'undefined' ? Date.now() : performance.now() * 1000;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = ((Math.random() * 16 + d) % 16) | 0;
    return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const appendAt = <T>(data: T[], value: T | T[]): T[] => [...data, ...convertToArrayPayload(value)];

export const fillEmptyArray = <T>(value: T | T[]): undefined[] | undefined =>
  Array.isArray(value) ? value.map(() => undefined) : undefined;

function removeAtIndexes<T>(data: T[], indexes: number[]): T[] {
  let i = 0;
  const temp = [...data];
  for (const index of indexes) {
    temp.splice(index - i, 1);
    i++;
  }
  return compact(temp).length ? temp : [];
}

export const removeArrayAt = <T>(data: T[], index?: number | number[]): T[] =>
  isUndefined(index) ? [] : removeAtIndexes(data, convertToArrayPayload(index).sort((a, b) => a - b));

/** A registered field, mirroring react-hook-form's `_fields[name]._f`. */
export interface FieldRecord {
  name: string;
  ref: any;
  refs?: HTMLInputElement[];
  mount: boolean;
  setValueAs?: (value: any) => any;
}

export type FieldTree = Record<string, any>;

/** react-hook-form's iterateFieldsByAction — walks registered fields in registration order. */
export function iterateFieldsByAction(
  fields: FieldTree,
  action: (ref: any, name: string) => 1 | undefined | void,
  fieldsNames?: Iterable<string>,
  abortEarly?: boolean,
): true | undefined {
  for (const key of fieldsNames || Object.keys(fields)) {
    const field = get(fields, key);
    if (field) {
      const { _f, ...currentField } = field;
      if (_f) {
        if (_f.refs && _f.refs[0] && action(_f.refs[0], key) && !abortEarly) {
          return true;
        } else if (_f.ref && action(_f.ref, _f.name) && !abortEarly) {
          return true;
        } else if (iterateFieldsByAction(currentField, action)) {
          break;
        }
      } else if (isObject(currentField)) {
        if (iterateFieldsByAction(currentField, action)) {
          break;
        }
      }
    }
  }
  return;
}

/** react-hook-form's schemaErrorLookup. */
export function schemaErrorLookup(
  errors: any,
  fields: FieldTree,
  name: string,
): { error?: any; name: string } {
  const error = get(errors, name);
  if (error || isKey(name)) {
    return { error, name };
  }
  const names = name.split('.');
  while (names.length) {
    const fieldName = names.join('.');
    const field = get(fields, fieldName);
    const foundError = get(errors, fieldName);
    if (field && !Array.isArray(field) && name !== fieldName) {
      return { name };
    }
    if (foundError && foundError.type) {
      return { name: fieldName, error: foundError };
    }
    if (foundError && foundError.root && foundError.root.type) {
      return { name: `${fieldName}.root`, error: foundError.root };
    }
    names.pop();
  }
  return { name };
}
