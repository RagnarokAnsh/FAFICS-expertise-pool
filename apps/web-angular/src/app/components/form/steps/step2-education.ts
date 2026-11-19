import { ChangeDetectionStrategy, Component, Injector, OnInit, inject, output } from '@angular/core';
import { FieldArray, FormStore } from '../../../core/form/form-store';
import { RegisterDirective } from '../../../core/form/register.directive';
import { ToastService } from '../../../core/toast.service';
import { LANGUAGES, LANGUAGE_OTHER } from '../../../lib/constants/languages';
import { firstErrorMessage } from '../../../lib/utils/form-errors';
import { ButtonComponent } from '../../ui/button';
import { CardComponent } from '../../ui/card';
import { DynamicRowListComponent } from '../../ui/dynamic-row-list';
import { InputDirective, SelectDirective } from '../../ui/field';

const PROFICIENCIES = [
  { value: 'mother_tongue', label: 'Mother tongue' },
  { value: 'proficient', label: 'Proficient' },
  { value: 'working_level', label: 'Working-level' },
  { value: 'basic', label: 'Basic' },
];

/** components/form/steps/Step2Education.tsx */
@Component({
  selector: 'div[appStep2Education]',
  imports: [CardComponent, InputDirective, SelectDirective, ButtonComponent, DynamicRowListComponent, RegisterDirective],
  template: `
    <div class="mb-7">
      <h2 class="font-serif text-[22px] font-bold text-navy mb-1">Education &amp; Languages</h2>
      <p class="text-[13.5px] text-text-mid leading-relaxed">
        List your academic qualifications (college degree and higher) and working languages. To add a qualification,
        press the <strong>+ Add Qualification</strong> button.
      </p>
    </div>

    <div appCard heading="Educational Qualifications (College Degree and Higher)">
      @if (form.error('educations')?.root?.message; as rootMessage) {
        <p class="text-danger text-sm mb-3">{{ rootMessage }}</p>
      }
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1fr 1fr">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Degree / Qualification <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Institution <span class="text-gold">*</span></span
        >
      </div>

      <div
        appDynamicRowList
        [items]="edu.ids()"
        gridTemplateColumns="1fr 1fr"
        (add)="edu.append({ degreeName: '', institution: '', sortOrder: edu.ids().length + 1 })"
        addLabel="Add Qualification"
        [rowTemplate]="eduRow"
      ></div>
      <ng-template #eduRow let-index="index">
        <input
          appInput
          placeholder="Degree Name"
          [hasError]="!!form.error('educations.' + index + '.degreeName')"
          [appRegister]="'educations.' + index + '.degreeName'"
        />
        <div class="flex gap-2">
          <input
            appInput
            placeholder="Institution"
            class="flex-1"
            [hasError]="!!form.error('educations.' + index + '.institution')"
            [appRegister]="'educations.' + index + '.institution'"
          />
          @if (edu.ids().length > 1) {
            <button appButton type="button" variant="remove" (click)="edu.remove(index)">×</button>
          }
        </div>
      </ng-template>
    </div>

    <div appCard heading="UN Working Languages">
      @if (form.error('languages')?.root?.message; as rootMessage) {
        <p class="text-danger text-sm mb-3">{{ rootMessage }}</p>
      }
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1fr 1fr">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Language <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Level of Proficiency <span class="text-gold">*</span></span
        >
      </div>

      <div
        appDynamicRowList
        [items]="lang.ids()"
        gridTemplateColumns="1fr 1fr"
        (add)="lang.append({ language: '', proficiency: '', sortOrder: lang.ids().length + 1 })"
        addLabel="Add Language"
        [rowTemplate]="langRow"
      ></div>
      <ng-template #langRow let-index="index">
        <div class="flex flex-col gap-1">
          <select
            appSelect
            [hasError]="!!form.error('languages.' + index + '.language')"
            [appRegister]="'languages.' + index + '.language'"
          >
            <option value="" hidden>Select language...</option>
            @for (l of languages; track l) {
              <option [value]="l" [disabled]="usedElsewhere(index).includes(l)">{{ l }}</option>
            }
            <option [value]="languageOther">Other (please specify)</option>
          </select>
          @if (form.error('languages.' + index + '.language')?.message; as message) {
            <span class="text-[11.5px] text-danger">{{ message }}</span>
          }
          @if (form.value('languages.' + index + '.language') === languageOther) {
            <input
              appInput
              placeholder="Please specify the language…"
              [hasError]="!!form.error('languages.' + index + '.languageOther')"
              [appRegister]="'languages.' + index + '.languageOther'"
            />
            @if (form.error('languages.' + index + '.languageOther')?.message; as message) {
              <span class="text-[11.5px] text-danger">{{ message }}</span>
            }
          }
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex gap-2">
            <select
              appSelect
              class="flex-1"
              [hasError]="!!form.error('languages.' + index + '.proficiency')"
              [appRegister]="'languages.' + index + '.proficiency'"
            >
              <option value="" hidden>Select level...</option>
              @for (p of proficiencies; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
            @if (lang.ids().length > 1) {
              <button appButton type="button" variant="remove" (click)="lang.remove(index)">×</button>
            }
          </div>
          @if (form.error('languages.' + index + '.proficiency')?.message) {
            <span class="text-[11.5px] text-danger">Proficiency Level is required</span>
          }
        </div>
      </ng-template>
    </div>

    <div class="flex justify-between items-center pt-5 border-t border-border mt-2">
      <button appButton variant="ghost" (click)="back.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <button appButton variant="primary" (click)="handleNext()">
        Next: Work Experience
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'animate-[fadeIn_0.25s_ease]' },
})
export class Step2EducationComponent implements OnInit {
  readonly next = output<void>();
  readonly back = output<void>();

  protected readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  protected readonly languages = LANGUAGES;
  protected readonly languageOther = LANGUAGE_OTHER;
  protected readonly proficiencies = PROFICIENCIES;

  protected readonly edu: FieldArray = this.form.fieldArray('educations', this.injector);
  protected readonly lang: FieldArray = this.form.fieldArray('languages', this.injector);

  ngOnInit(): void {
    // Ensure at least one row exists on mount if empty
    if (this.edu.ids().length === 0) {
      this.edu.append({ degreeName: '', institution: '', sortOrder: 1 });
    }
    if (this.lang.ids().length === 0) {
      // Proficiency intentionally starts EMPTY so the placeholder shows and the
      // applicant makes an explicit choice (QA: default was "Working-level").
      this.lang.append({ language: '', proficiency: '', sortOrder: 1 });
    }
  }

  // Languages picked in other rows — unavailable to avoid duplicates.
  protected usedElsewhere(index: number): string[] {
    const watchedLangs: any[] = this.form.value('languages') ?? [];
    return watchedLangs.map((l, i) => (i !== index ? l?.language : null)).filter((l): l is string => !!l);
  }

  protected async handleNext(): Promise<void> {
    const isValid = await this.form.trigger(['educations', 'languages']);
    if (!isValid) {
      this.toast.showToast(
        firstErrorMessage(this.form.renderedErrors) ?? 'Please fill in all required fields highlighted below.',
        'error',
      );
      return;
    }
    this.next.emit();
  }
}
