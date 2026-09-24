import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormStore } from '../../../core/form/form-store';
import { RegisterDirective } from '../../../core/form/register.directive';
import { ToastService } from '../../../core/toast.service';
import { ButtonComponent } from '../../ui/button';
import { CardComponent } from '../../ui/card';

/** components/form/steps/Step5ConsentSubmit.tsx */
@Component({
  selector: 'div[appStep5ConsentSubmit]',
  imports: [CardComponent, ButtonComponent, RegisterDirective],
  template: `
    <div class="mb-7">
      <h2 class="font-serif text-[22px] font-bold text-navy mb-1">Consent &amp; Submit</h2>
      <p class="text-[13.5px] text-text-mid leading-relaxed">
        Please review your information, read the data protection notice, and submit your application.
      </p>
    </div>

    <div appCard heading="Review Summary">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-off-white border border-border rounded-lg px-4 py-3.5">
          <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
            <span>Personal Info</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Name:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]"
                >{{ values.personal?.firstName }} {{ values.personal?.lastName }}</span
              >
            </div>
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Email:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]">{{ values.personal?.email }}</span>
            </div>
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Association:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]">{{
                values.association?.associationName
              }}</span>
            </div>
          </div>
          <button
            type="button"
            class="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans"
            (click)="goToStep.emit(1)"
          >
            Edit Section
          </button>
        </div>

        <div class="bg-off-white border border-border rounded-lg px-4 py-3.5">
          <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
            <span>Education &amp; Languages</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Degrees:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]">{{ values.educations?.length || 0 }}</span>
            </div>
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Languages:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]">{{ values.languages?.length || 0 }}</span>
            </div>
          </div>
          <button
            type="button"
            class="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans"
            (click)="goToStep.emit(2)"
          >
            Edit Section
          </button>
        </div>

        <div class="bg-off-white border border-border rounded-lg px-4 py-3.5">
          <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
            <span>Experience</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">UN:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]"
                >{{ values.unExperiences?.length || 0 }} roles</span
              >
            </div>
          </div>
          <button
            type="button"
            class="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans"
            (click)="goToStep.emit(3)"
          >
            Edit Section
          </button>
        </div>

        <div class="bg-off-white border border-border rounded-lg px-4 py-3.5">
          <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-navy-mid mb-2.5">
            <span>Expertise</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2 items-baseline">
              <span class="text-[11.5px] text-text-muted min-w-[90px] shrink-0">Preferred:</span>
              <span class="text-[12.5px] text-text font-medium leading-[1.4]">{{ preferredCount }} areas</span>
            </div>
          </div>
          <button
            type="button"
            class="mt-3 bg-transparent border-none text-[12px] text-navy-mid font-semibold cursor-pointer underline underline-offset-2 hover:text-gold p-0 font-sans"
            (click)="goToStep.emit(4)"
          >
            Edit Section
          </button>
        </div>
      </div>
    </div>

    <div class="bg-gold-light border-[1.5px] border-gold rounded-theme px-[22px] py-5 mb-5">
      <p class="text-[13.5px] text-text leading-[1.75] mb-3">
        FAFICS will store and keep your personal information <strong>confidential</strong>.
      </p>
      <p class="text-[13.5px] text-text leading-[1.75] mb-3">
        It will be used solely to assess your potential selection to serve in FAFICS or as a FAFICS representative.
      </p>
      <p class="text-[13.5px] text-text leading-[1.75] mb-3">
        The individual and/or the Local Association may be contacted to obtain any further information.
      </p>
      <p class="text-[13.5px] text-text leading-[1.75] mb-4">
        Your data will be held for a <strong>three year period</strong> and securely deleted or archived thereafter unless
        renewed.
      </p>
      <div class="flex flex-col gap-2.5">
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent_data"
            class="w-5 h-5 shrink-0 mt-[2px] accent-navy cursor-pointer"
            appRegister="consentData"
          />
          <label for="consent_data" class="text-[14px] font-medium text-navy cursor-pointer leading-[1.5]">
            I <strong>consent</strong> to FAFICS storing and using my personal information as described above for Expertise
            Pool purposes.
          </label>
        </div>
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent_accurate"
            class="w-5 h-5 shrink-0 mt-[2px] accent-navy cursor-pointer"
            appRegister="consentAccurate"
          />
          <label for="consent_accurate" class="text-[14px] font-medium text-navy cursor-pointer leading-[1.5]">
            I <strong>declare</strong> that all information provided in this application is accurate, complete, and up to
            date to the best of my knowledge.
          </label>
        </div>
      </div>
      @if (submitError()) {
        <p class="text-danger text-sm mt-3">{{ submitError() }}</p>
      }
    </div>

    <div class="mb-5">
      <h3 class="text-[14px] font-bold text-navy mb-3">What happens next?</h3>
      <div class="flex flex-col">
        <div class="flex items-start gap-3.5 py-3 px-1">
          <div
            class="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-[#dceeff] text-[#185FA5] border-[1.5px] border-[#b5d4f4]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">
              Application submitted &amp; reference number assigned
            </div>
            <div class="text-[12.5px] text-text-mid leading-[1.6]">
              System records your submission with a unique Application Reference Number (e.g. EP-0042). A confirmation is
              sent to your email.
            </div>
          </div>
          <span
            class="text-[11px] font-semibold bg-[#EAF3DE] text-[#3B6D11] border border-[#C0DD97] rounded-[20px] px-2.5 py-[3px] shrink-0 ml-2 whitespace-nowrap"
            >Automatic</span
          >
        </div>
        <div class="w-[2px] h-[18px] bg-border ml-[19px]"></div>

        <div class="flex items-start gap-3.5 py-3 px-1">
          <div
            class="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-gold-light text-[#85500b] border-[1.5px] border-[#fac775]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">
              Local Association President notified for endorsement
            </div>
            <div class="text-[12.5px] text-text-mid leading-[1.6]">
              A secure endorsement link is sent to your Local Association President or designated official. They review
              your application with view-only access and endorse it.
            </div>
          </div>
          <span
            class="text-[11px] font-semibold bg-[#EAF3DE] text-[#3B6D11] border border-[#C0DD97] rounded-[20px] px-2.5 py-[3px] shrink-0 ml-2 whitespace-nowrap"
            >Automatic</span
          >
        </div>
        <div class="w-[2px] h-[18px] bg-border ml-[19px]"></div>

        <div class="flex items-start gap-3.5 py-3 px-1">
          <div
            class="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 bg-[#EAF3DE] text-[#3B6D11] border-[1.5px] border-[#C0DD97]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-[13.5px] font-semibold text-text mb-[3px] leading-[1.3]">Profile added to the Expertise Pool</div>
            <div class="text-[12.5px] text-text-mid leading-[1.6]">
              Once endorsed, your profile is added to the FAFICS Expertise Pool with three-year validity.
            </div>
          </div>
          <span
            class="text-[11px] font-semibold bg-[#EAF3DE] text-[#3B6D11] border border-[#C0DD97] rounded-[20px] px-2.5 py-[3px] shrink-0 ml-2 whitespace-nowrap"
            >Automatic</span
          >
        </div>
      </div>
    </div>

    <div class="flex gap-3.5 items-start bg-navy-light border border-border border-l-[3px] border-l-navy rounded-lg py-4 px-[18px] mb-5">
      <div class="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>
        <div class="text-[13px] font-semibold text-navy mb-1">Audit Trail &amp; Data Security</div>
        <div class="text-[12.5px] text-text-mid leading-[1.65]">
          All actions taken on your application (endorsements by the Local Association President, status changes) are
          securely logged in our immutable audit trail.
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center pt-5 border-t border-border mt-2">
      <button appButton variant="ghost" (click)="back.emit()" [disabled]="isSubmitting()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <button appButton variant="submit" (click)="handleNext()" [disabled]="isSubmitting()">
        {{ isSubmitting() ? 'Submitting...' : 'Submit Application' }}
        @if (!isSubmitting()) {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        }
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'animate-[fadeIn_0.25s_ease]' },
})
export class Step5ConsentSubmitComponent {
  readonly isSubmitting = input(false);
  readonly next = output<{ consentData: boolean; consentAccurate: boolean }>();
  readonly back = output<void>();
  readonly goToStep = output<number>();

  private readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);
  protected readonly submitError = signal<string | null>(null);

  // Read once when the step renders, like `getValues()` in the React component body.
  protected readonly values = this.form.getValues();
  protected readonly preferredCount = this.values.expertise?.filter((e: any) => e.isPreferred).length || 0;

  protected async handleNext(): Promise<void> {
    this.submitError.set(null);
    const isValid = await this.form.trigger(['consentData', 'consentAccurate']);
    if (isValid) {
      this.next.emit({ consentData: true, consentAccurate: true });
    } else {
      this.submitError.set('Please check all consent boxes before submitting.');
      this.toast.showToast('Please check all consent boxes before submitting.', 'error');
    }
  }
}
