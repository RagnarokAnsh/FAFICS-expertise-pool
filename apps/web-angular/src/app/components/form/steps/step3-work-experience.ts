import { ChangeDetectionStrategy, Component, Injector, OnInit, inject, output } from '@angular/core';
import { FieldArray, FormStore } from '../../../core/form/form-store';
import { ControllerDirective, RegisterDirective } from '../../../core/form/register.directive';
import { ToastService } from '../../../core/toast.service';
import {
  AREAS_OF_EXPERTISE,
  COMMITTEE_OTHER,
  FAFICS_COMMITTEES,
  FAFICS_ROLES,
  UN_AGENCIES,
  UN_GRADES,
} from '../../../lib/constants/work';
import { experienceExceedsAge } from '../../../lib/schemas/application.schema';
import { firstErrorMessage } from '../../../lib/utils/form-errors';
import { ButtonComponent } from '../../ui/button';
import { CardComponent } from '../../ui/card';
import { DynamicRowListComponent } from '../../ui/dynamic-row-list';
import { InputDirective, SelectDirective, TextAreaDirective } from '../../ui/field';
import { MultiSelectComponent } from '../../ui/multi-select';

// FAFICS "Area of Contribution" stores multiple committees as a delimited
// string in the existing single column. '; ' is safe — committee names contain
// no semicolons.
const COMMITTEE_SEP = '; ';

const DURATIONS = [
  { value: 0.5, label: '< 1 year' },
  { value: 1.0, label: '1 year' },
  { value: 2.0, label: '2 years' },
  { value: 5.0, label: '3-5 years' },
  { value: 10.0, label: '6-10 years' },
  { value: 20.0, label: '11-20 years' },
  { value: 99.0, label: '20+ years' },
];

const parseDuration = (v: string) => (v === '' ? undefined : parseFloat(v));

/** components/form/steps/Step3WorkExperience.tsx */
@Component({
  selector: 'div[appStep3WorkExperience]',
  imports: [
    CardComponent,
    InputDirective,
    SelectDirective,
    TextAreaDirective,
    ButtonComponent,
    DynamicRowListComponent,
    MultiSelectComponent,
    RegisterDirective,
    ControllerDirective,
  ],
  template: `
    <div class="mb-7">
      <h2 class="font-serif text-[22px] font-bold text-navy mb-1">Work Experience</h2>
      <p class="text-[13.5px] text-text-mid leading-relaxed">
        List your last 2–3 positions for each category. Use <strong>+ Add Position</strong> to add rows.
      </p>
    </div>

    <div appCard heading="A — United Nations Experience">
      @if (form.error('unExperiences')?.root?.message; as rootMessage) {
        <p class="text-danger text-sm mb-3">{{ rootMessage }}</p>
      }
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1.2fr 1.4fr 80px 1fr 100px">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Agency <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Position Held <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Grade</span>
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Expertise</span>
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Years</span>
      </div>

      <div
        appDynamicRowList
        [items]="un.ids()"
        gridTemplateColumns="1.2fr 1.4fr 80px 1fr 100px"
        (add)="un.append({ agency: '', positionTitle: '', sortOrder: un.ids().length + 1 })"
        addLabel="Add Position"
        [rowTemplate]="unRow"
      ></div>
      <ng-template #unRow let-index="index">
        <select
          appSelect
          [hasError]="!!form.error('unExperiences.' + index + '.agency')"
          [appRegister]="'unExperiences.' + index + '.agency'"
        >
          <option value="" hidden>Agency...</option>
          @for (a of unAgencies; track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
        <input
          appInput
          placeholder="Position Title"
          [hasError]="!!form.error('unExperiences.' + index + '.positionTitle')"
          [appRegister]="'unExperiences.' + index + '.positionTitle'"
        />
        <select
          appSelect
          [hasError]="!!form.error('unExperiences.' + index + '.grade')"
          [appRegister]="'unExperiences.' + index + '.grade'"
        >
          <option value="" hidden>Grade</option>
          @for (g of unGrades; track g) {
            <option [value]="g">{{ g }}</option>
          }
        </select>
        <select
          appSelect
          [hasError]="!!form.error('unExperiences.' + index + '.areaOfExpertise')"
          [appRegister]="'unExperiences.' + index + '.areaOfExpertise'"
        >
          <option value="" hidden>Area...</option>
          @for (a of areasOfExpertise; track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
        <div class="flex gap-2">
          <select
            appSelect
            class="flex-1"
            [hasError]="!!form.error('unExperiences.' + index + '.durationYears')"
            [appRegister]="'unExperiences.' + index + '.durationYears'"
            [setValueAs]="parseDuration"
          >
            <option value="" hidden>Years</option>
            @for (d of durations; track d.value) {
              <option [value]="d.value">{{ d.label }}</option>
            }
          </select>
          @if (un.ids().length > 1) {
            <button appButton type="button" variant="remove" (click)="un.remove(index)">×</button>
          }
        </div>
      </ng-template>
      <div class="mt-4">
        <div class="flex items-center gap-2.5 my-3">
          <span class="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap"
            >Summary of proven UN experience &amp; achievements</span
          >
          <div class="flex-1 h-px bg-border"></div>
        </div>
        <textarea
          appTextArea
          placeholder="Briefly describe your key achievements and contributions in UN organizations (bullet points preferred)…"
          appRegister="unExperienceSummary"
        ></textarea>
      </div>
    </div>

    <div appCard heading="B — Non-UN Experience">
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1.2fr 1.4fr 1fr 100px">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Organization <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Position Held <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Expertise</span>
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Years</span>
      </div>

      <div
        appDynamicRowList
        [items]="nonUn.ids()"
        gridTemplateColumns="1.2fr 1.4fr 1fr 100px"
        (add)="nonUn.append({ organization: '', positionTitle: '', sortOrder: nonUn.ids().length + 1 })"
        addLabel="Add Position"
        [rowTemplate]="nonUnRow"
      ></div>
      <ng-template #nonUnRow let-index="index">
        <input
          appInput
          placeholder="Organization"
          [hasError]="!!form.error('nonUnExperiences.' + index + '.organization')"
          [appRegister]="'nonUnExperiences.' + index + '.organization'"
        />
        <input
          appInput
          placeholder="Position Title"
          [hasError]="!!form.error('nonUnExperiences.' + index + '.positionTitle')"
          [appRegister]="'nonUnExperiences.' + index + '.positionTitle'"
        />
        <select appSelect [appRegister]="'nonUnExperiences.' + index + '.areaOfExpertise'">
          <option value="" hidden>Area...</option>
          @for (a of areasOfExpertise; track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
        <div class="flex gap-2">
          <select
            appSelect
            class="flex-1"
            [appRegister]="'nonUnExperiences.' + index + '.durationYears'"
            [setValueAs]="parseDuration"
          >
            <option value="" hidden>Years</option>
            @for (d of durations; track d.value) {
              <option [value]="d.value">{{ d.label }}</option>
            }
          </select>
          <button appButton type="button" variant="remove" (click)="nonUn.remove(index)">×</button>
        </div>
      </ng-template>
      <div class="mt-4">
        <div class="flex items-center gap-2.5 my-3">
          <span class="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap"
            >Summary of non-UN experience &amp; achievements</span
          >
          <div class="flex-1 h-px bg-border"></div>
        </div>
        <textarea
          appTextArea
          placeholder="Briefly describe your key contributions outside the UN system…"
          appRegister="nonUnExperienceSummary"
        ></textarea>
      </div>
    </div>

    <div appCard heading="C — FAFICS Experience">
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1.5fr 1fr 120px">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Position Held <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Area of Contribution <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Duration (years) <span class="text-gold">*</span></span
        >
      </div>

      <div
        appDynamicRowList
        [items]="fafics.ids()"
        gridTemplateColumns="1.5fr 1fr 120px"
        (add)="fafics.append({ positionHeld: '', sortOrder: fafics.ids().length + 1 })"
        addLabel="Add Position"
        [rowTemplate]="faficsRow"
      ></div>
      <ng-template #faficsRow let-index="index">
        <select
          appSelect
          [hasError]="!!form.error('faficsExperiences.' + index + '.positionHeld')"
          [appRegister]="'faficsExperiences.' + index + '.positionHeld'"
        >
          <option value="" hidden>Position...</option>
          @for (r of faficsRoles; track r) {
            <option [value]="r">{{ r }}</option>
          }
        </select>
        <div class="flex flex-col gap-1.5">
          <div
            appMultiSelect
            [appController]="'faficsExperiences.' + index + '.areaOfContribution'"
            [options]="faficsCommittees"
            [value]="committeesFor(index)"
            (valueChange)="onCommitteesChange(index, $event)"
            placeholder="Committee/Working Group Member…"
          ></div>
          @if (committeesFor(index).includes(committeeOther)) {
            <input
              appInput
              placeholder="Please specify other committee / contribution…"
              [appRegister]="'faficsExperiences.' + index + '.areaOfContributionOther'"
            />
          }
        </div>
        <div class="flex gap-2">
          <select
            appSelect
            class="flex-1"
            [appRegister]="'faficsExperiences.' + index + '.durationYears'"
            [setValueAs]="parseDuration"
          >
            <option value="" hidden>Years</option>
            @for (d of durations; track d.value) {
              <option [value]="d.value">{{ d.label }}</option>
            }
          </select>
          <button appButton type="button" variant="remove" (click)="fafics.remove(index)">×</button>
        </div>
      </ng-template>
      <div class="mt-4">
        <div class="flex items-center gap-2.5 my-3">
          <span class="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap"
            >Summary of FAFICS contributions &amp; achievements</span
          >
          <div class="flex-1 h-px bg-border"></div>
        </div>
        <textarea
          appTextArea
          placeholder="Describe your key contributions to FAFICS…"
          appRegister="faficsExperienceSummary"
        ></textarea>
      </div>
    </div>

    <div appCard heading="D — Local Association Experience">
      <div class="hidden lg:grid gap-2.5 pb-1 pl-10 pr-3" style="grid-template-columns: 1.5fr 1fr 120px">
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted"
          >Position Held <span class="text-gold">*</span></span
        >
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Contribution</span>
        <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Duration (years)</span>
      </div>

      <div
        appDynamicRowList
        [items]="local.ids()"
        gridTemplateColumns="1.5fr 1fr 120px"
        (add)="local.append({ positionHeld: '', sortOrder: local.ids().length + 1 })"
        addLabel="Add Position"
        [rowTemplate]="localRow"
      ></div>
      <ng-template #localRow let-index="index">
        <input
          appInput
          placeholder="Position Held"
          [hasError]="!!form.error('localExperiences.' + index + '.positionHeld')"
          [appRegister]="'localExperiences.' + index + '.positionHeld'"
        />
        <select appSelect [appRegister]="'localExperiences.' + index + '.areaOfContribution'">
          <option value="" hidden>Area...</option>
          @for (a of areasOfExpertise; track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
        <div class="flex gap-2">
          <select
            appSelect
            class="flex-1"
            [appRegister]="'localExperiences.' + index + '.durationYears'"
            [setValueAs]="parseDuration"
          >
            <option value="" hidden>Years</option>
            @for (d of durations; track d.value) {
              <option [value]="d.value">{{ d.label }}</option>
            }
          </select>
          <button appButton type="button" variant="remove" (click)="local.remove(index)">×</button>
        </div>
      </ng-template>
      <div class="mt-4">
        <div class="flex items-center gap-2.5 my-3">
          <span class="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap"
            >Summary of local association contributions</span
          >
          <div class="flex-1 h-px bg-border"></div>
        </div>
        <textarea
          appTextArea
          placeholder="Describe your key contributions to your local association…"
          appRegister="localExperienceSummary"
        ></textarea>
      </div>
    </div>

    <div class="flex justify-between items-center pt-5 border-t border-border mt-2">
      <button appButton variant="ghost" (click)="back.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <button appButton variant="primary" (click)="handleNext()">
        Next: Self Assessment
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'animate-[fadeIn_0.25s_ease]' },
})
export class Step3WorkExperienceComponent implements OnInit {
  readonly next = output<void>();
  readonly back = output<void>();

  protected readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  protected readonly durations = DURATIONS;
  protected readonly unAgencies = UN_AGENCIES;
  protected readonly unGrades = UN_GRADES;
  protected readonly faficsRoles = FAFICS_ROLES;
  protected readonly faficsCommittees = FAFICS_COMMITTEES;
  protected readonly areasOfExpertise = AREAS_OF_EXPERTISE;
  protected readonly committeeOther = COMMITTEE_OTHER;
  protected readonly parseDuration = parseDuration;

  protected readonly un: FieldArray = this.form.fieldArray('unExperiences', this.injector);
  protected readonly nonUn: FieldArray = this.form.fieldArray('nonUnExperiences', this.injector);
  protected readonly fafics: FieldArray = this.form.fieldArray('faficsExperiences', this.injector);
  protected readonly local: FieldArray = this.form.fieldArray('localExperiences', this.injector);

  ngOnInit(): void {
    if (this.un.ids().length === 0) {
      this.un.append({ agency: '', positionTitle: '', grade: '', areaOfExpertise: '', sortOrder: 1 });
    }
  }

  protected committeesFor(index: number): string[] {
    const value: string | undefined = this.form.value(`faficsExperiences.${index}.areaOfContribution`);
    return value ? value.split(COMMITTEE_SEP).filter(Boolean) : [];
  }

  protected onCommitteesChange(index: number, vals: string[]): void {
    this.form.handleControllerChange(`faficsExperiences.${index}.areaOfContribution`, vals.join(COMMITTEE_SEP));
    // Clear the companion free text when "Other" is removed
    // so a stale value can't linger and re-surface on review.
    if (!vals.includes(COMMITTEE_OTHER)) {
      this.form.setValue(`faficsExperiences.${index}.areaOfContributionOther`, '');
    }
  }

  protected async handleNext(): Promise<void> {
    const isValid = await this.form.trigger([
      'unExperiences',
      'nonUnExperiences',
      'faficsExperiences',
      'localExperiences',
      'unExperienceSummary',
      'nonUnExperienceSummary',
      'faficsExperienceSummary',
      'localExperienceSummary',
    ]);
    if (!isValid) {
      this.toast.showToast(
        firstErrorMessage(this.form.renderedErrors) ?? 'Please fill in all required fields highlighted below.',
        'error',
      );
      return;
    }
    // Total experience can't exceed the applicant's age. Checked here because
    // the schema-level rule only runs once the whole form parses (final submit).
    const ageError = experienceExceedsAge(this.form.getValues());
    if (ageError) {
      this.form.setError('unExperiences.root', { type: 'custom', message: ageError });
      this.toast.showToast(ageError, 'error');
      return;
    }
    this.next.emit();
  }
}
