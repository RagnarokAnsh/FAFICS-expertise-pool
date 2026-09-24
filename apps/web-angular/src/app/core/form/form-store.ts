import { Injectable, Injector, afterNextRender, inject, signal } from '@angular/core';
import type { ZodType } from 'zod';
import {
  FieldTree,
  appendAt,
  cloneObject,
  compact,
  convertToArrayPayload,
  deepEqual,
  fillEmptyArray,
  generateId,
  get,
  isEmptyObject,
  isKey,
  isNullOrUndefined,
  isObject,

  isUndefined,
  iterateFieldsByAction,
  removeArrayAt,
  schemaErrorLookup,
  set,
  stringToPath,
  unset,
  unsetEmptyArray,
} from './rhf-utils';
import { resolve } from './zod-resolver';

export interface FieldError {
  type?: string;
  message?: string;
  ref?: unknown;
  root?: FieldError;
  [key: string]: any;
}

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isRadio = (el: any): el is HTMLInputElement => el?.type === 'radio';
const isCheckbox = (el: any): el is HTMLInputElement => el?.type === 'checkbox';
const isRadioOrCheckbox = (el: any) => isRadio(el) || isCheckbox(el);
const live = (el: any) => el instanceof HTMLElement && el.isConnected;

function getFieldValueAs(value: any, setValueAs?: (v: any) => any) {
  return isUndefined(value) ? value : setValueAs ? setValueAs(value) : value;
}

function getRadioValue(refs: HTMLInputElement[] | undefined): any {
  return Array.isArray(refs)
    ? refs.reduce<any>((prev, option) => (option && option.checked && !option.disabled ? option.value : prev), null)
    : null;
}

function getCheckboxValue(refs: HTMLInputElement[] | undefined): any {
  if (Array.isArray(refs)) {
    if (refs.length > 1) {
      return refs.filter((o) => o && o.checked && !o.disabled).map((o) => o.value);
    }
    const option = refs[0];
    return option.checked && !option.disabled
      ? option.attributes && !isUndefined((option.attributes as any).value)
        ? isUndefined(option.value) || option.value === ''
          ? true
          : option.value
        : true
      : false;
  }
  return false;
}

/**
 * The application form's state container — a signal-based port of the parts of
 * react-hook-form 7.76 the Next.js app relies on (mode: 'onChange' with the zod
 * resolver). Values, validation timing, error objects, field arrays, focus
 * behaviour and watch notifications all follow the original, so the Angular
 * form behaves the same keystroke for keystroke.
 */
@Injectable()
export class FormStore {
  private readonly injector = inject(Injector);

  private schema!: ZodType;
  private _defaultValues: any = {};
  private _values: any = {};
  private _errors: Record<string, any> = {};
  /** See `renderedErrors`. */
  private _renderedErrors: Record<string, any> = {};
  /** Registered fields, shaped like react-hook-form's `_fields`. */
  readonly _fields: FieldTree = {};
  private readonly mountNames = new Set<string>();
  readonly arrayNames = new Set<string>();
  /** react-hook-form's `_names.focus` — set by append, consumed after render. */
  focusName = '';
  private readonly watchers = new Set<(values: any) => void>();

  /** Bumped on every value change; read it to track values reactively. */
  private readonly valuesVersion = signal(0);
  /** Bumped on every error change. */
  private readonly errorsVersion = signal(0);

  /**
   * useForm({ defaultValues }). Pass `reset: true` when the React form also calls
   * `form.reset(initialData)` on mount (resumed and draft forms): that reset
   * re-renders the form, which makes `renderedErrors` live from the start.
   */
  init(schema: ZodType, defaultValues?: any, { reset = false }: { reset?: boolean } = {}): void {
    this.schema = schema;
    this._defaultValues = isObject(defaultValues) ? cloneObject(defaultValues) : {};
    this._values = cloneObject(this._defaultValues);
    this._renderedErrors = reset ? this._errors : {};
  }

  // ── Reading ─────────────────────────────────────────────────────────────

  /** Reactive read of a single value (like useWatch / field.value). */
  value(name: string): any {
    this.valuesVersion();
    return get(this._values, name);
  }

  /** react-hook-form getValues(). */
  getValues(name?: string): any {
    const values = { ...this._values };
    return isUndefined(name) ? values : get(values, name);
  }

  /** Reactive read of the error at `name` (formState.errors.<name>). */
  error(name: string): FieldError | undefined {
    this.errorsVersion();
    return get(this._errors, name);
  }

  /** The whole (live) errors object, as formState.errors. */
  get errors(): Record<string, any> {
    this.errorsVersion();
    return this._errors;
  }

  /**
   * `methods.formState.errors` as the React steps read it right after
   * `await trigger(...)`: the errors object captured at the last form-state
   * render. React re-renders only after the handler's continuation has run, and
   * a fresh form's first snapshot is a separate empty object. So the very first
   * failed "Next" on a new form shows the generic toast ("Please fill in all
   * required fields highlighted below.") and later ones name the first error,
   * exactly like the React form.
   */
  get renderedErrors(): Record<string, any> {
    return this._renderedErrors;
  }

  /** A form-state update that re-renders the React form host (errors are subscribed). */
  markRendered(): void {
    const errors = this._errors;
    setTimeout(() => (this._renderedErrors = errors));
  }

  // ── Watching ────────────────────────────────────────────────────────────

  /** react-hook-form watch(callback). Returns an unsubscribe function. */
  watch(callback: (values: any) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  private notifyWatchers(): void {
    const values = cloneObject(this._values);
    for (const watcher of [...this.watchers]) {
      watcher(values);
    }
  }

  private bumpValues(): void {
    this.valuesVersion.update((v) => v + 1);
  }

  private bumpErrors(): void {
    this.errorsVersion.update((v) => v + 1);
  }

  // ── Registration ────────────────────────────────────────────────────────

  private hasExplicitNullIntermediate(name: string): boolean {
    const segments = isKey(name) ? [name] : stringToPath(name);
    let formValues = this._values;
    let defaultValues = this._defaultValues;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      formValues = isNullOrUndefined(formValues) ? formValues : formValues[key];
      defaultValues = isNullOrUndefined(defaultValues) ? defaultValues : defaultValues[key];
      if (formValues === null && defaultValues !== null) {
        return true;
      }
    }
    return false;
  }

  private getFieldValue(_f: any): any {
    const ref = _f.ref;
    if (isRadio(ref)) return getRadioValue(_f.refs);
    if (isCheckbox(ref)) return getCheckboxValue(_f.refs);
    return getFieldValueAs(isUndefined(ref.value) ? _f.ref.value : ref.value, _f.setValueAs);
  }

  private setFieldValue(name: string, value: any): void {
    const field = get(this._fields, name);
    if (field && field._f) {
      set(this._values, name, getFieldValueAs(value, field._f.setValueAs));
    }
    // The DOM is brought in line by RegisterDirective's render effect.
  }

  private updateValidAndValue(name: string, shouldSkipSetValueAs: boolean, value?: any, ref?: any): void {
    const field = get(this._fields, name);
    if (!field) return;
    if (this.hasExplicitNullIntermediate(name)) return;
    const defaultValue = get(this._values, name, isUndefined(value) ? get(this._defaultValues, name) : value);
    if (isUndefined(defaultValue) || (ref && ref.defaultChecked) || shouldSkipSetValueAs) {
      set(this._values, name, shouldSkipSetValueAs ? defaultValue : this.getFieldValue(field._f));
    } else {
      this.setFieldValue(name, defaultValue);
    }
    this.bumpValues();
  }

  /** react-hook-form register(name, options) — the part that runs during render. */
  registerName(name: string, options: { setValueAs?: (v: any) => any } = {}): void {
    const field = get(this._fields, name);
    const shouldRevalidateRemount = field && field._f && !field._f.mount;
    set(this._fields, name, {
      ...(field || {}),
      _f: {
        ...(field && field._f ? field._f : { ref: { name } }),
        name,
        mount: true,
        ...options,
      },
    });
    this.mountNames.add(name);
    if (!(field && !shouldRevalidateRemount)) {
      this.updateValidAndValue(name, true, undefined);
    }
  }

  /** register(name) + its ref callback with a DOM element. */
  registerElement(name: string, el: FieldElement, options: { setValueAs?: (v: any) => any } = {}): void {
    this.registerName(name, options);
    const field = get(this._fields, name);
    const radioOrCheckbox = isRadioOrCheckbox(el);
    const refs: any[] = field._f.refs || [];
    if (radioOrCheckbox ? refs.find((option) => option === el) : el === field._f.ref) {
      return;
    }
    set(this._fields, name, {
      _f: {
        ...field._f,
        ...(radioOrCheckbox
          ? {
              refs: [...refs.filter(live), el, ...(Array.isArray(get(this._defaultValues, name)) ? [{}] : [])],
              ref: { type: (el as HTMLInputElement).type, name },
            }
          : { ref: el }),
      },
    });
    this.updateValidAndValue(name, false, undefined, el);
  }

  /** The ref callback called with `null` — the field stays in values/errors. */
  unregisterElement(name: string, el: FieldElement): void {
    const field = get(this._fields, name);
    if (!field || !field._f) return;
    const owned = field._f.ref === el || (field._f.refs || []).includes(el);
    if (owned) {
      field._f.mount = false;
    }
  }

  /** Controller registration (useController): value lives in the store only. */
  registerController(name: string): void {
    this.registerName(name, {});
  }

  unregisterController(name: string): void {
    const field = get(this._fields, name);
    if (field && field._f) {
      field._f.mount = false;
    }
  }

  // ── Changes & validation ────────────────────────────────────────────────

  private run(names?: string[]) {
    const fieldNames = names || [...this.mountNames];
    const fields: FieldTree = {};
    for (const name of fieldNames) {
      const field = get(this._fields, name);
      if (field) set(fields, name, field._f);
    }
    return resolve(this.schema, this._values, fieldNames, fields);
  }

  /** onChange from a registered DOM element (input/change event). */
  handleElementChange(name: string): void {
    const field = get(this._fields, name);
    if (!field || !field._f) return;
    this.applyChange(name, this.getFieldValue(field._f));
  }

  /** field.onChange from a Controller. */
  handleControllerChange(name: string, value: any): void {
    const field = get(this._fields, name);
    if (!field) return;
    this.applyChange(name, value);
  }

  private applyChange(name: string, fieldValue: any): void {
    set(this._values, name, fieldValue);
    this.bumpValues();
    this.notifyWatchers();

    // mode 'onChange' (and reValidateMode 'onChange'): every change validates.
    const { errors } = this.run([name]);
    const previous = schemaErrorLookup(this._errors, this._fields, name);
    const lookup = schemaErrorLookup(errors, this._fields, previous.name || name);
    const previousFieldError = get(this._errors, lookup.name);
    lookup.error ? set(this._errors, lookup.name, lookup.error) : unset(this._errors, lookup.name);
    this.bumpErrors();
    if (lookup.error ? !deepEqual(previousFieldError, lookup.error) : previousFieldError) {
      this.markRendered();
    }
  }

  /** react-hook-form trigger(name?). */
  async trigger(name?: string | string[]): Promise<boolean> {
    const fieldNames = isUndefined(name) ? undefined : convertToArrayPayload(name);
    const { errors } = this.run(fieldNames);
    if (fieldNames) {
      for (const fieldName of fieldNames) {
        const error = get(errors, fieldName);
        if (error) {
          if (this.arrayNames.has(fieldName) && isObject(error)) {
            // updateFieldArrayRootError
            const fieldArrayErrors: any = convertToArrayPayload(get(this._errors, fieldName));
            set(fieldArrayErrors, 'root', error);
            set(this._errors, fieldName, fieldArrayErrors);
          } else {
            set(this._errors, fieldName, error);
          }
        } else {
          unset(this._errors, fieldName);
        }
      }
    } else {
      this._errors = errors;
    }
    this.bumpErrors();
    this.markRendered();
    return fieldNames ? !fieldNames.some((n) => get(errors, n)) : isEmptyObject(errors);
  }

  /** react-hook-form setError(name, error). */
  setError(name: string, error: FieldError): void {
    const ref = (get(this._fields, name, { _f: {} })._f || {}).ref;
    const currentError = get(this._errors, name) || {};
    const { ref: _currentRef, message: _message, type: _type, ...restOfErrorTree } = currentError;
    set(this._errors, name, { ...restOfErrorTree, ...error, ref });
    this.bumpErrors();
    this.markRendered();
  }

  /** react-hook-form setValue(name, value) — no validation, notifies watchers. */
  setValue(name: string, value: any): void {
    const field = get(this._fields, name);
    const cloneValue = cloneObject(value);
    const previousValue = get(this._values, name);
    const isValueUnchanged = deepEqual(previousValue, cloneValue);
    if (!isValueUnchanged) {
      set(this._values, name, cloneValue);
    }
    if (!this.arrayNames.has(name)) {
      const isEmpty = (Array.isArray(cloneValue) && !cloneValue.length) || isEmptyObject(cloneValue);
      if (!field || field._f || isNullOrUndefined(cloneValue) || isEmpty) {
        this.setFieldValue(name, cloneValue);
      }
    }
    if (!isValueUnchanged) {
      this.bumpValues();
      this.notifyWatchers();
    }
  }

  private focusInput = (ref: any, key: string): 1 | undefined => {
    if (get(this._errors, key) && ref.focus) {
      ref.focus();
      return 1;
    }
    return;
  };

  private focusError(): void {
    iterateFieldsByAction(this._fields, this.focusInput, this.mountNames);
  }

  /** react-hook-form handleSubmit(onValid, onInvalid). */
  handleSubmit(
    onValid: (data: any) => unknown | Promise<unknown>,
    onInvalid?: (errors: Record<string, any>) => unknown | Promise<unknown>,
  ): () => Promise<void> {
    return async () => {
      const { errors, values } = this.run();
      this._errors = errors;
      const fieldValues = cloneObject(values);
      unset(this._errors, 'root');
      this.bumpErrors();
      if (isEmptyObject(this._errors)) {
        await onValid(fieldValues);
      } else {
        if (onInvalid) {
          await onInvalid({ ...this._errors });
        }
        this.focusError();
        setTimeout(() => this.focusError());
      }
      this.markRendered();
    };
  }

  // ── Field arrays ────────────────────────────────────────────────────────

  getFieldArray(name: string): any[] {
    return compact(get(this._values, name, []));
  }

  setFieldArrayValues(name: string, values: any[]): void {
    set(this._values, name, values);
    this.bumpValues();
  }

  /** _setFieldArray(name, values, method, args) — keeps field refs and errors in step. */
  setFieldArrayWithMethod(name: string, method: (data: any[], argA?: any) => any[], argA: any): void {
    this.markRendered();
    if (Array.isArray(get(this._fields, name))) {
      set(this._fields, name, method(get(this._fields, name), argA));
    }
    if (Array.isArray(get(this._errors, name))) {
      set(this._errors, name, method(get(this._errors, name), argA));
      unsetEmptyArray(this._errors, name);
      this.bumpErrors();
    }
  }

  /**
   * useFieldArray's post-render effect: re-check the array-level error after
   * an action, notify watchers, and focus the row an append asked for.
   */
  afterFieldArrayRender(name: string, actioned: boolean): void {
    if (actioned) {
      const { errors } = this.run([name]);
      const error = get(errors, name);
      const existingError = get(this._errors, name);
      if (
        existingError
          ? (!error && existingError.type) ||
            (error && (existingError.type !== error.type || existingError.message !== error.message))
          : error && error.type
      ) {
        error ? set(this._errors, name, error) : unset(this._errors, name);
        this.bumpErrors();
        this.markRendered();
      }
    }
    this.notifyWatchers();
    if (this.focusName) {
      iterateFieldsByAction(this._fields, (ref, key) => {
        if (this.focusName && key.startsWith(this.focusName) && ref.focus) {
          ref.focus();
          return 1;
        }
        return;
      });
    }
    this.focusName = '';
  }

  /**
   * useFieldArray's mount effect: `!get(_formValues, name) && _setFieldArray(name)`.
   * A missing array becomes [] in the form values (so autosave sends
   * `nonUnExperiences: []` and so on, exactly like the React form), without any
   * notification.
   */
  initFieldArrayValue(name: string): void {
    if (!get(this._values, name)) set(this._values, name, []);
  }

  /** Creates the useFieldArray equivalent for `name`. Call from a component. */
  fieldArray(name: string, injector: Injector = this.injector): FieldArray {
    return new FieldArray(this, name, injector);
  }
}

/** Port of useFieldArray — one instance per mounted step component. */
export class FieldArray {
  /** Stable row keys (react-hook-form's generated field ids). */
  readonly ids = signal<string[]>([]);
  /** Snapshot of row values as of the last array action (useFieldArray `fields`). */
  readonly fields = signal<any[]>([]);

  constructor(
    private readonly store: FormStore,
    readonly name: string,
    private readonly injector: Injector,
  ) {
    store.arrayNames.add(name);
    const current = store.getFieldArray(name);
    this.ids.set(current.map(generateId));
    this.fields.set(current);
    this.afterRender(false);
    // Second mount effect, after the first (same order as useFieldArray's effects).
    afterNextRender(() => store.initFieldArrayValue(name), { injector });
  }

  private afterRender(actioned: boolean): void {
    afterNextRender(() => this.store.afterFieldArrayRender(this.name, actioned), { injector: this.injector });
  }

  append(value: any): void {
    const appendValue = convertToArrayPayload(cloneObject(value));
    const updated = appendAt(this.store.getFieldArray(this.name), appendValue);
    this.store.focusName = `${this.name}.${updated.length - 1}.`;
    this.ids.set(appendAt(this.ids(), appendValue.map(generateId)));
    this.store.setFieldArrayValues(this.name, updated);
    this.fields.set(updated);
    this.store.setFieldArrayWithMethod(this.name, appendAt, fillEmptyArray(value));
    this.afterRender(true);
  }

  remove(index: number): void {
    const updated = removeArrayAt(this.store.getFieldArray(this.name), index);
    this.ids.set(removeArrayAt(this.ids(), index));
    this.store.setFieldArrayValues(this.name, updated);
    this.fields.set(updated);
    if (!Array.isArray(get(this.store._fields, this.name))) {
      set(this.store._fields, this.name, undefined);
    }
    this.store.setFieldArrayWithMethod(this.name, removeArrayAt, index);
    this.afterRender(true);
  }

  replace(value: any[]): void {
    const updated = convertToArrayPayload(cloneObject(value));
    this.ids.set(updated.map(generateId));
    this.store.setFieldArrayValues(this.name, [...updated]);
    this.fields.set([...updated]);
    this.store.markRendered(); // _setFieldArray(name, values, (data) => data, {}) emits
    this.afterRender(true);
  }
}


