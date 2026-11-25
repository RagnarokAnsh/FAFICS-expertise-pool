import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

let nextFieldId = 0;

/**
 * <div appField label="…" [required] [error] [hint]> — Field from components/ui/Field.tsx.
 *
 * The label, hint and error are linked to the field's control (label `for`,
 * `aria-describedby`), so screen readers announce the field name and its
 * error, and clicking the label focuses the control. The control directives
 * below (and the custom selects / phone input) register their element id here.
 */
@Component({
  selector: 'div[appField]',
  template: `
    <label class="text-[12px] font-semibold text-text tracking-[0.02em] uppercase" [attr.for]="controlId()">
      {{ label() }} @if (required()) {<span class="text-gold ml-[2px]">*</span>}
    </label>
    <ng-content />
    @if (hint() && !error()) {
      <span [id]="hintId" class="text-[11.5px] text-text-muted mt-[-2px]">{{ hint() }}</span>
    }
    @if (error()) {
      <span [id]="errorId" class="text-[11.5px] text-danger mt-[-2px]">{{ error() }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-[5px]' },
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly error = input<string | undefined>(undefined);
  readonly hint = input<string | undefined>(undefined);

  private readonly baseId = `field-${++nextFieldId}`;
  /** Id for the control a directive inside this field should use. */
  readonly defaultControlId = `${this.baseId}-control`;
  protected readonly hintId = `${this.baseId}-hint`;
  protected readonly errorId = `${this.baseId}-error`;
  /** The registered control's id (null until one registers). */
  readonly controlId = signal<string | null>(null);
  /** What the control should point aria-describedby at. */
  readonly describedBy = computed(() => (this.error() ? this.errorId : this.hint() ? this.hintId : null));
}

/**
 * Shared by the control directives: takes the element's own id or the field's,
 * registers it with the surrounding field, and exposes the aria wiring.
 */
@Directive()
abstract class FieldControl {
  readonly hasError = input(false);
  protected readonly field = inject(FieldComponent, { optional: true });
  protected readonly controlId: string | null;

  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    this.controlId = el.id || this.field?.defaultControlId || null;
    if (this.controlId) this.field?.controlId.set(this.controlId);
  }

  protected readonly describedBy = computed(() => this.field?.describedBy() ?? null);
}

const CONTROL_HOST = {
  '[attr.id]': 'controlId',
  '[attr.aria-invalid]': 'hasError() ? "true" : null',
  '[attr.aria-describedby]': 'describedBy()',
};

const FIELD_BASE =
  'border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-text bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)]';
const ERROR_CLASSES = '!border-danger !bg-[#fff5f5]';

/** <input appInput [hasError]> — Input from components/ui/Field.tsx. */
@Directive({
  selector: 'input[appInput]',
  host: { '[class]': 'classes()', ...CONTROL_HOST },
})
export class InputDirective extends FieldControl {
  protected readonly classes = computed(
    () => `h-[40px] px-3 ${FIELD_BASE} ${this.hasError() ? ERROR_CLASSES : ''}`,
  );
}

/** <select appSelect [hasError]> — Select from components/ui/Field.tsx. */
@Directive({
  selector: 'select[appSelect]',
  host: {
    ...CONTROL_HOST,
    '[class]': 'classes()',
    '[style.background-image]': 'backgroundImage',
    '[style.background-repeat]': '"no-repeat"',
    '[style.background-position]': '"right 12px center"',
  },
})
export class SelectDirective extends FieldControl {
  protected readonly backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238892aa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;
  protected readonly classes = computed(
    () => `h-[40px] px-3 pr-9 ${FIELD_BASE} appearance-none ${this.hasError() ? ERROR_CLASSES : ''}`,
  );
}

/** <textarea appTextArea [hasError]> — TextArea from components/ui/Field.tsx. */
@Directive({
  selector: 'textarea[appTextArea]',
  host: { '[class]': 'classes()', ...CONTROL_HOST },
})
export class TextAreaDirective extends FieldControl {
  protected readonly classes = computed(
    () =>
      `w-full max-w-full min-h-[110px] p-[10px_12px] resize-y ${FIELD_BASE} ${this.hasError() ? ERROR_CLASSES : ''}`,
  );
}
