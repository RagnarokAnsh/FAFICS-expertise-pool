import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  OnInit,
  afterRenderEffect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { FormStore } from './form-store';
import { isNullOrUndefined } from './rhf-utils';

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Inputs whose react-hook-form onChange fires on `input` (React's onChange for text). */
function isTextLike(el: FieldElement): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file';
  }
  return false;
}

/**
 * Angular equivalent of `{...register('some.path')}` on a native input, select
 * or textarea. The element registers with the FormStore once its view (and any
 * <option> children) exist — the moment React runs the ref callback — then the
 * DOM is kept in step with the stored value, user changes are reported, and the
 * `name` attribute is set exactly as react-hook-form does.
 */
@Directive({
  selector: '[appRegister]',
  host: {
    '[attr.name]': 'name()',
    '(input)': 'onInput()',
    '(change)': 'onChange()',
  },
})
export class RegisterDirective implements AfterViewInit {
  readonly name = input.required<string>({ alias: 'appRegister' });
  /** register(name, { setValueAs }) */
  readonly setValueAs = input<((value: any) => any) | undefined>(undefined);
  /**
   * Rewrites the element's value before react-hook-form reads it — used where
   * the React version pairs register() with an onInput handler that runs first.
   */
  readonly inputFilter = input<((value: string) => string) | undefined>(undefined);

  private readonly store = inject(FormStore);
  private readonly el = inject<ElementRef<FieldElement>>(ElementRef).nativeElement;
  private registeredName: string | null = null;

  constructor() {
    afterRenderEffect(() => {
      const name = this.name();
      untracked(() => {
        // A row above this one was removed, so the field's index (and name) shifted.
        if (this.registeredName !== null && this.registeredName !== name) {
          this.store.unregisterElement(this.registeredName, this.el);
          this.registeredName = name;
          this.store.registerElement(name, this.el, { setValueAs: this.setValueAs() });
        }
      });
      const value = this.store.value(name);
      untracked(() => this.syncDom(value));
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.registeredName) {
        this.store.unregisterElement(this.registeredName, this.el);
      }
    });
  }

  ngAfterViewInit(): void {
    this.registeredName = this.name();
    this.store.registerElement(this.registeredName, this.el, { setValueAs: this.setValueAs() });
    this.syncDom(this.store.value(this.registeredName));
  }

  /** Bring the element in line with the stored value (react-hook-form setFieldValue). */
  private syncDom(value: unknown): void {
    const el = this.el;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      const checked = value === el.value || !!value;
      if (el.checked !== checked) el.checked = checked;
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      const checked = el.value === value;
      if (el.checked !== checked) el.checked = checked;
    } else {
      const next = isNullOrUndefined(value) ? '' : String(value);
      if (el.value !== next) el.value = next;
    }
  }

  protected onInput(): void {
    if (!isTextLike(this.el)) return;
    const filter = this.inputFilter();
    if (filter) {
      this.el.value = filter(this.el.value);
    }
    this.report();
  }

  protected onChange(): void {
    if (isTextLike(this.el)) return;
    this.report();
  }

  private report(): void {
    if (this.registeredName !== this.name()) {
      return;
    }
    this.store.handleElementChange(this.name());
  }
}

/**
 * Registers a Controller-driven field (a custom component whose value lives in
 * the FormStore), mirroring useController's register call during render.
 */
@Directive({ selector: '[appController]' })
export class ControllerDirective implements OnInit {
  readonly name = input.required<string>({ alias: 'appController' });
  private readonly store = inject(FormStore);
  private registeredName: string | null = null;

  constructor() {
    afterRenderEffect(() => {
      const name = this.name();
      untracked(() => {
        if (this.registeredName !== null && this.registeredName !== name) {
          this.store.unregisterController(this.registeredName);
          this.registeredName = name;
          this.store.registerController(name);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.registeredName) {
        this.store.unregisterController(this.registeredName);
      }
    });
  }

  ngOnInit(): void {
    this.registeredName = this.name();
    this.store.registerController(this.registeredName);
  }
}
