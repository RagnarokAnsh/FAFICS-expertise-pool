import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FieldArray, FormStore } from '../../../core/form/form-store';
import { ControllerDirective, RegisterDirective } from '../../../core/form/register.directive';
import { ToastService } from '../../../core/toast.service';
import { FIXED_EXPERTISE_AREAS } from '../../../lib/constants/expertise';
import { COMMITTEE_OTHER, COMPETENCIES, FAFICS_COMMITTEES, MAX_COMPETENCIES } from '../../../lib/constants/work';
import { STEP_ERROR_MESSAGE, focusFirstInvalid } from '../../../lib/utils/focus-first-invalid';
import { ButtonComponent } from '../../ui/button';
import { CardComponent } from '../../ui/card';
import { InputDirective, TextAreaDirective } from '../../ui/field';
import { MultiSelectComponent } from '../../ui/multi-select';

/** components/form/steps/Step4SelfAssessment.tsx */
@Component({
  selector: 'div[appStep4SelfAssessment]',
  imports: [
    CardComponent,
    InputDirective,
    TextAreaDirective,
    ButtonComponent,
    MultiSelectComponent,
    RegisterDirective,
    ControllerDirective,
  ],
  template: `
    <div class="mb-7">
      <h2 class="font-serif text-[22px] font-bold text-navy mb-1">Self-Assessment on Expertise</h2>
      <p class="text-[13.5px] text-text-mid leading-relaxed">
        Rate your level in each area and tick your <strong>top 3 preferred areas</strong> where you wish to support
        FAFICS. If your area of expertise is not listed below, use the <strong>"+ Add Other Area"</strong> button at the
        bottom of the table to add it.
      </p>
    </div>

    @if (form.error('expertise')?.root?.message; as rootMessage) {
      <p class="text-danger text-sm mb-3" role="alert" tabindex="-1" data-form-error>{{ rootMessage }}</p>
    }

    <div appCard heading="Expertise Level & Preference">
      @if (isNarrow()) {
        <!-- Phones: one block per area, so every choice is visible without scrolling sideways. -->
        <ul class="divide-y divide-border -my-2">
          @for (id of expertise.ids(); track id; let index = $index) {
            <li class="py-3">
              @if (!expertise.fields()[index]?.isCustom) {
                <div class="text-[13.5px] font-medium text-text">{{ expertise.fields()[index]?.areaLabel }}</div>
              } @else {
                <div class="flex gap-2">
                  <input
                    appInput
                    placeholder="Other Area Name"
                    class="w-full !h-8 !text-[13px]"
                    [hasError]="!!form.error('expertise.' + index + '.areaLabel')"
                    [appRegister]="'expertise.' + index + '.areaLabel'"
                  />
                  <button appButton type="button" variant="remove" class="!mt-0 shrink-0" (click)="expertise.remove(index)">
                    ×
                  </button>
                </div>
              }
              @if (form.error('expertise.' + index + '.expertiseLevel')?.message; as msg) {
                <span class="block text-[11.5px] text-danger mt-1">{{ msg }}</span>
              }
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2" role="radiogroup" [attr.aria-label]="'Level for ' + areaName(index)">
                <label class="inline-flex items-center gap-1.5 text-[13px] text-text cursor-pointer">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="average"
                    [attr.aria-invalid]="levelInvalid(index)"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                  Average
                </label>
                <label class="inline-flex items-center gap-1.5 text-[13px] text-text cursor-pointer">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="advanced"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                  Advanced
                </label>
                <label class="inline-flex items-center gap-1.5 text-[13px] text-text cursor-pointer">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="expert"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                  Expert
                </label>
                <label class="inline-flex items-center gap-1.5 text-[13px] text-text cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    class="w-[17px] h-[17px] accent-gold cursor-pointer"
                    [disabled]="maxReached() && !form.value('expertise.' + index + '.isPreferred')"
                    [appRegister]="'expertise.' + index + '.isPreferred'"
                  />
                  Preferred
                </label>
              </div>
            </li>
          }
        </ul>
      } @else {
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-left bg-off-white"
                style="width: 42%"
              >
                Area of Expertise / Knowledge
              </th>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-center bg-navy-light"
                colspan="3"
              >
                Level of Expertise
              </th>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-center bg-off-white"
                style="width: 100px"
              >
                Preferred<br /><small class="font-normal normal-case tracking-normal">(Top 3 ✓)</small>
              </th>
            </tr>
            <tr>
              <th class="bg-off-white"></th>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light"
                style="width: 90px"
              >
                Average
              </th>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light"
                style="width: 90px"
              >
                Advanced
              </th>
              <th
                class="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light"
                style="width: 90px"
              >
                Expert
              </th>
              <th class="bg-off-white border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            @for (id of expertise.ids(); track id; let index = $index) {
              <tr class="hover:bg-navy-light transition-colors border-b border-border last:border-b-0">
                <td class="px-3 py-2.5 align-middle text-[13.5px] font-medium text-text">
                  @if (!expertise.fields()[index]?.isCustom) {
                    {{ expertise.fields()[index]?.areaLabel }}
                  } @else {
                    <div class="flex gap-2">
                      <input
                        appInput
                        placeholder="Other Area Name"
                        class="w-full !h-8 !text-[13px]"
                        [hasError]="!!form.error('expertise.' + index + '.areaLabel')"
                        [appRegister]="'expertise.' + index + '.areaLabel'"
                      />
                      <button appButton type="button" variant="remove" class="!mt-0 shrink-0" (click)="expertise.remove(index)">
                        ×
                      </button>
                    </div>
                  }
                  @if (form.error('expertise.' + index + '.expertiseLevel')?.message; as msg) {
                    <span class="block text-[11.5px] text-danger mt-1 font-normal">{{ msg }}</span>
                  }
                </td>
                <td class="px-3 py-2.5 align-middle text-center">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="average"
                    [attr.aria-label]="'Average: ' + areaName(index)"
                    [attr.aria-invalid]="levelInvalid(index)"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                </td>
                <td class="px-3 py-2.5 align-middle text-center">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="advanced"
                    [attr.aria-label]="'Advanced: ' + areaName(index)"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                </td>
                <td class="px-3 py-2.5 align-middle text-center">
                  <input
                    type="radio"
                    class="w-[17px] h-[17px] accent-navy cursor-pointer"
                    value="expert"
                    [attr.aria-label]="'Expert: ' + areaName(index)"
                    [appRegister]="'expertise.' + index + '.expertiseLevel'"
                  />
                </td>
                <td class="px-3 py-2.5 align-middle text-center">
                  <input
                    type="checkbox"
                    class="w-[17px] h-[17px] accent-gold cursor-pointer"
                    [disabled]="maxReached() && !form.value('expertise.' + index + '.isPreferred')"
                    [attr.aria-label]="'Preferred: ' + areaName(index)"
                    [appRegister]="'expertise.' + index + '.isPreferred'"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      }

      @if (maxReached()) {
        <div class="mt-4 px-3 py-2 bg-gold-light border border-gold rounded-lg text-[13px] text-navy font-medium">
          You have selected your top 3 preferred areas.
        </div>
      }

      <div class="mt-4">
        <button appButton type="button" variant="add" (click)="addOtherArea()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Other Area
        </button>
      </div>
    </div>

    <div appCard heading="Competencies — Top 5 Core Strengths">
      <p class="text-[13px] text-text-mid leading-relaxed mb-4">
        Select up to <strong>five</strong> competencies that represent your core strengths.
      </p>
      <div
        appMultiSelect
        appController="competencies"
        [options]="competencies"
        [value]="form.value('competencies') ?? []"
        (valueChange)="form.handleControllerChange('competencies', $event)"
        [max]="maxCompetencies"
        placeholder="Select your core strengths…"
      ></div>
    </div>

    <div appCard heading="Position / Committee Preference (Optional)">
      <p class="text-[13px] text-text-mid leading-relaxed mb-4">
        If you wish to be considered for a particular FAFICS position or standing committee, indicate your preference(s)
        below and briefly describe the rationale and what you can offer. This helps committee chairs identify suitable
        members from the pool. Your preferences do not prevent you from being considered for other committees or
        assignments.
      </p>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-[5px]">
          <label class="text-[12px] font-semibold text-text tracking-[0.02em] uppercase">
            Preferred Position(s) / Committee(s)
          </label>
          <div class="flex flex-col gap-1.5">
            <div
              appMultiSelect
              appController="preferredCommittees"
              [options]="faficsCommittees"
              [value]="form.value('preferredCommittees') ?? []"
              (valueChange)="onPreferredCommitteesChange($event)"
              placeholder="Select committee/working group…"
            ></div>
            @if ((form.value('preferredCommittees') ?? []).includes(committeeOther)) {
              <input
                appInput
                placeholder="Please specify other position / committee…"
                appRegister="preferredCommitteesOther"
              />
            }
          </div>
        </div>
        <div class="flex flex-col gap-[5px]">
          <label class="text-[12px] font-semibold text-text tracking-[0.02em] uppercase">
            Rationale / What You Offer
          </label>
          <textarea
            appTextArea
            placeholder="Briefly explain why you are interested and what relevant skills or experience you bring…"
            appRegister="positionPreferenceRationale"
          ></textarea>
        </div>
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
        Next: Consent &amp; Submit
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'animate-[fadeIn_0.25s_ease]' },
})
export class Step4SelfAssessmentComponent implements OnInit {
  readonly next = output<void>();
  readonly back = output<void>();

  protected readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  protected readonly competencies = COMPETENCIES;
  protected readonly maxCompetencies = MAX_COMPETENCIES;
  protected readonly faficsCommittees = FAFICS_COMMITTEES;
  protected readonly committeeOther = COMMITTEE_OTHER;

  protected readonly expertise: FieldArray = this.form.fieldArray('expertise', this.injector);

  /** Phones get the stacked layout; the table needs about 640px. */
  protected readonly isNarrow = signal(false);

  constructor() {
    const query = window.matchMedia('(max-width: 639px)');
    this.isNarrow.set(query.matches);
    const onChange = (e: MediaQueryListEvent) => this.isNarrow.set(e.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }

  protected areaName(index: number): string {
    return this.expertise.fields()[index]?.areaLabel || 'Other area';
  }

  /** Marks a row's first radio when it needs a level, so "Next" can focus it. */
  protected levelInvalid(index: number): 'true' | null {
    return this.form.error('expertise.' + index + '.expertiseLevel') ? 'true' : null;
  }

  protected readonly maxReached = computed(() => {
    const expertiseWatch: any[] | undefined = this.form.value('expertise');
    const selectedPreferencesCount = expertiseWatch?.filter((e) => e.isPreferred)?.length || 0;
    return selectedPreferencesCount >= 3;
  });

  ngOnInit(): void {
    // Reconcile any saved expertise with the canonical fixed areas so the
    // matrix is ALWAYS rendered in full (per the form structure), with saved
    // levels/preferences overlaid by areaKey and custom "Other" rows kept last.
    const current = this.form.getValues('expertise') || [];
    const savedByKey = new Map(current.filter((e: any) => !e.isCustom).map((e: any) => [e.areaKey, e]));
    const fixedRows = FIXED_EXPERTISE_AREAS.map((area, index) => {
      const saved: any = savedByKey.get(area.key);
      return saved
        ? { ...saved, areaLabel: area.label, isCustom: false, sortOrder: index + 1 }
        : {
            areaKey: area.key,
            areaLabel: area.label,
            isPreferred: false,
            isCustom: false,
            sortOrder: index + 1,
          };
    });
    const customRows = current
      .filter((e: any) => e.isCustom)
      .map((e: any, k: number) => ({ ...e, sortOrder: fixedRows.length + k + 1 }));
    this.expertise.replace([...fixedRows, ...customRows]);
  }

  protected addOtherArea(): void {
    const length = this.expertise.ids().length;
    this.expertise.append({
      areaKey: `custom_${length}`,
      areaLabel: '',
      isPreferred: false,
      isCustom: true,
      sortOrder: length + 1,
    });
  }

  protected onPreferredCommitteesChange(vals: string[]): void {
    this.form.handleControllerChange('preferredCommittees', vals);
    // Clear the companion free text when "Other" is removed.
    if (!vals.includes(COMMITTEE_OTHER)) {
      this.form.setValue('preferredCommitteesOther', '');
    }
  }

  protected async handleNext(): Promise<void> {
    const isValid = await this.form.trigger('expertise');
    if (!isValid) {
      this.toast.showToast(
        this.form.error('expertise')?.root?.message ?? STEP_ERROR_MESSAGE,
        'error',
      );
      focusFirstInvalid();
      return;
    }
    this.next.emit();
  }
}
