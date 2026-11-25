import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, input, signal, untracked } from '@angular/core';
import { FormStore } from '../../core/form/form-store';
import { ToastService } from '../../core/toast.service';
import { applicationsApi } from '../../lib/api/applications.api';
import { ApplicationData } from '../../lib/schemas/application.schema';
import { withBasePath } from '../../lib/utils/base-path';
import { firstErrorMessage } from '../../lib/utils/form-errors';
import { ApplicationFormState, REPLACED_LINK_MESSAGE, sanitizeForApi } from './application-form.state';
import { FormProgressComponent } from './form-progress';
import { Step1PersonalInfoComponent } from './steps/step1-personal-info';
import { Step2EducationComponent } from './steps/step2-education';
import { Step3WorkExperienceComponent } from './steps/step3-work-experience';
import { Step4SelfAssessmentComponent } from './steps/step4-self-assessment';
import { Step5ConsentSubmitComponent } from './steps/step5-consent-submit';
import { formatTime } from '../../lib/utils/date';


/** components/form/ApplicationForm.tsx */
@Component({
  selector: 'app-application-form',
  imports: [
    FormProgressComponent,
    Step1PersonalInfoComponent,
    Step2EducationComponent,
    Step3WorkExperienceComponent,
    Step4SelfAssessmentComponent,
    Step5ConsentSubmitComponent,
  ],
  providers: [FormStore, ApplicationFormState],
  template: `
    @if (submitSuccess()) {
      <div class="max-w-[700px] mx-auto py-12 px-6">
        <div class="bg-white border border-border rounded-theme p-10 text-center shadow-theme">
          <div class="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" class="w-8 h-8">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 class="font-serif text-[28px] font-bold text-navy mb-4">Application Submitted!</h2>
          <p class="text-[15px] text-text mb-6">
            Thank you for applying to the FAFICS Expertise Pool. Your application has been successfully received.
          </p>
          <div class="bg-navy-light border border-border rounded-lg p-6 mb-8 max-w-[400px] mx-auto">
            <p class="text-[12px] uppercase tracking-wider font-bold text-navy-mid mb-2">Your Reference Number</p>
            <p class="font-mono text-[24px] font-bold text-navy">{{ referenceNumber() }}</p>
          </div>
          <p class="text-[14px] text-text-mid mb-8">
            We have sent a confirmation email with these details and a link to view your submitted application. Your
            application has also been forwarded to your Local Association President for endorsement.
          </p>
          <button
            class="px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors"
            (click)="returnHome()"
          >
            Return to Home
          </button>
        </div>
      </div>
    } @else {
      <div class="w-full">
        @if (state.inProgressNotice()) {
          <div class="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center px-4">
            <div
              class="bg-white rounded-theme shadow-theme max-w-[460px] w-full p-8 text-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="in-progress-title"
            >
              <h2 id="in-progress-title" class="font-serif text-[22px] font-bold text-navy mb-3">
                You already have an application in progress
              </h2>
              <p class="text-[14px] text-text-mid mb-3 leading-relaxed">
                We found an application in progress for these details. To keep it safe, we don't open it here: we have
                emailed a link to continue it to the email address on that application.
              </p>
              <p class="text-[13px] text-text-muted mb-7 leading-relaxed">
                Can't find the email? Check your spam folder, or request a new link from the Application Status page.
              </p>
              <div class="flex flex-col gap-3">
                <a
                  [href]="statusUrl"
                  class="px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors"
                >
                  Go to Application Status
                </a>
                <button
                  (click)="state.inProgressNotice.set(false)"
                  class="px-6 py-3 bg-white border border-border text-navy text-[14px] font-semibold rounded-lg hover:bg-navy-light transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        }

        <div class="bg-navy text-white px-4 md:px-8 py-8 lg:py-10 border-t border-white/10">
          <div class="max-w-[1020px] mx-auto text-center">
            <div class="text-[12px] uppercase tracking-[0.1em] text-gold font-bold mb-3">Volunteer Application</div>
            <h1 class="font-serif text-[28px] md:text-[36px] font-bold mb-4 leading-tight">The FAFICS Expertise Pool</h1>
            <p class="text-[14px] md:text-[15px] text-white/80 max-w-[700px] leading-relaxed text-center mx-auto">
              For all former International Civil Servants wishing to volunteer their time and expertise for positions
              and functions within the Federation.
            </p>
          </div>
        </div>

        <div
          appFormProgress
          [currentStep]="state.currentStep()"
          [highestStep]="state.highestStep()"
          (goToStep)="state.goToStep($event)"
        ></div>

        <main class="max-w-[1020px] mx-auto px-4 md:px-8 py-8 md:py-10">
          <!-- Save status in the page flow below 1280px, where a floating badge would cover the form. -->
          @if (state.draftId() && state.currentStep() > 1) {
            <p class="xl:hidden -mt-4 mb-4 min-h-[18px] text-right text-[12px]" aria-live="polite">
              @switch (state.saveStatus()) {
                @case ('saving') {
                  <span class="text-text-muted">Saving…</span>
                }
                @case ('error') {
                  <span class="text-[#856404]">⚠ Save failed — check connection</span>
                }
                @default {
                  @if (state.lastSavedAt()) {
                    <span class="text-text-muted">✓ Saved {{ formatTime(state.lastSavedAt()!) }}</span>
                  }
                }
              }
            </p>
          }

          @if (presidentNotes()) {
            <div class="mb-8 p-6 bg-[#fff8e6] border border-[#f5d996] rounded-xl shadow-sm">
              <h3 class="font-serif text-[18px] font-bold text-[#8a6819] mb-2 flex items-center gap-2">
                <span class="text-[20px]">💬</span>President's Feedback
              </h3>
              <p class="text-[15px] text-[#735613] whitespace-pre-wrap leading-relaxed">{{ presidentNotes() }}</p>
            </div>
          }

          <form (submit)="$event.preventDefault()">
            @switch (state.currentStep()) {
              @case (1) {
                <div appStep1PersonalInfo (next)="state.handleNext()"></div>
              }
              @case (2) {
                <div appStep2Education (next)="state.handleNext()" (back)="state.handleBack()"></div>
              }
              @case (3) {
                <div appStep3WorkExperience (next)="state.handleNext()" (back)="state.handleBack()"></div>
              }
              @case (4) {
                <div appStep4SelfAssessment (next)="state.handleNext()" (back)="state.handleBack()"></div>
              }
              @case (5) {
                <div
                  appStep5ConsentSubmit
                  (next)="onStep5Next()"
                  (back)="state.handleBack()"
                  (goToStep)="state.goToStep($event)"
                  [isSubmitting]="isSubmitting()"
                ></div>
              }
            }
          </form>

          <!-- ── Draft creation toast (appears once after Step 1 completes) ── -->
          @if (showDraftToast() && state.draftCreatedEmail()) {
            <div
              class="fixed inset-x-4 bottom-4 z-[110] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-[380px] animate-[fadeIn_0.3s_ease]"
              style="animation: fadeIn 0.3s ease, fadeOut 0.5s ease 5.5s forwards"
            >
              <div class="bg-white border-l-4 border-[#3B6D11] rounded-lg shadow-lg p-4 flex items-start gap-3">
                <span class="text-[#3B6D11] text-[18px] mt-0.5">✓</span>
                <div>
                  <p class="text-[14px] font-semibold text-navy">Progress saved</p>
                  <p class="text-[13px] text-text-mid mt-1">
                    A link to resume this application has been sent to <strong>{{ state.draftCreatedEmail() }}</strong>. Check
                    your inbox.
                  </p>
                </div>
                <button
                  (click)="showDraftToast.set(false)"
                  class="text-text-muted hover:text-text text-[18px] ml-auto shrink-0 leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          }

          <!-- ── Persistent auto-save indicator (bottom-right, steps 2–5, 1280px and wider) ── -->
          @if (state.draftId() && state.currentStep() > 1) {
            <div class="hidden xl:block fixed bottom-6 right-6 z-[110]" aria-live="polite">
              @if (state.saveStatus() === 'saving') {
                <div
                  class="bg-navy text-white text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]"
                >
                  <svg class="animate-spin h-3.5 w-3.5 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span class="text-white/80">Saving...</span>
                </div>
              } @else if (state.saveStatus() === 'saved') {
                <div
                  class="bg-navy text-white text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]"
                >
                  <svg class="w-3.5 h-3.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5" /></svg
                  >Saved {{ state.lastSavedAt() ? formatTime(state.lastSavedAt()!) : '' }}
                </div>
              } @else if (state.saveStatus() === 'error') {
                <div
                  class="bg-white border border-[#f5c6cb] text-[#856404] text-[13px] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]"
                >
                  <span>⚠</span>Save failed — check connection
                </div>
              } @else if (state.lastSavedAt()) {
                <div class="bg-white/80 text-text-muted text-[12px] px-3 py-1.5 rounded-lg shadow border border-border">
                  ✓ Saved {{ formatTime(state.lastSavedAt()!) }}
                </div>
              }
            </div>
          }
        </main>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicationFormComponent implements OnInit {
  readonly initialData = input<Partial<ApplicationData> | undefined>(undefined);
  readonly initialDraftId = input<string | undefined>(undefined);
  readonly isResume = input<boolean | undefined>(undefined);
  readonly presidentNotes = input<string | null | undefined>(undefined);
  readonly editToken = input<string | undefined>(undefined);

  protected readonly state = inject(ApplicationFormState);
  private readonly toast = inject(ToastService);
  protected readonly statusUrl = withBasePath('/status');
  protected readonly isSubmitting = signal(false);
  protected readonly submitSuccess = signal(false);
  protected readonly referenceNumber = signal<string | null>(null);
  /* ── Draft creation toast ── */
  protected readonly showDraftToast = signal(false);
  protected readonly formatTime = formatTime;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const email = this.state.draftCreatedEmail();
      untracked(() => {
        clearTimeout(timer);
        if (email) {
          this.showDraftToast.set(true);
          timer = setTimeout(() => this.showDraftToast.set(false), 6000);
        }
      });
    });
    destroyRef.onDestroy(() => clearTimeout(timer));
  }

  ngOnInit(): void {
    this.state.init(this.initialData(), this.initialDraftId(), this.isResume(), this.editToken());
  }

  protected returnHome(): void {
    window.location.href = withBasePath('/');
  }

  protected onStep5Next(): void {
    // The full schema runs at submit; surface any failure instead
    // of letting the button silently do nothing.
    this.state.form.handleSubmit(
      (data) => this.onSubmitForm(data),
      (submitErrors) => {
        this.toast.showToast(
          firstErrorMessage(submitErrors) ??
            'Some information is missing or invalid. Please review the highlighted steps.',
          'error',
        );
      },
    )();
  }

  private async onSubmitForm(data: ApplicationData): Promise<void> {
    this.isSubmitting.set(true);
    try {
      const consent = { consentData: true, consentAccurate: true };
      const draftId = this.state.draftId();
      if (draftId) {
        // Final save before submission
        await applicationsApi.updateDraft(draftId, sanitizeForApi(data), this.state.editToken());
        const submitResponse = await applicationsApi.submitApplication(draftId, consent, this.state.editToken());
        this.referenceNumber.set(submitResponse.referenceNumber);
        this.submitSuccess.set(true);
        if (this.toast.toast()?.type === 'error') this.toast.close();
        if (!this.isResume()) {
          localStorage.removeItem('fafics_draft_id');
          localStorage.removeItem('fafics_draft_token');
        }
      } else {
        // No draft yet (user reached submit without the auto-save creating one):
        // create it now and reuse the returned edit token to authorize submission.
        const createResponse = await applicationsApi.createDraft(sanitizeForApi(data));
        if (createResponse.resumed || !createResponse.id || !createResponse.editToken) {
          // One is already in progress for these details; its owner was emailed a link.
          this.state.inProgressNotice.set(true);
          return;
        }
        const submitResponse = await applicationsApi.submitApplication(
          createResponse.id!,
          consent,
          createResponse.editToken!,
        );
        this.referenceNumber.set(submitResponse.referenceNumber);
        this.submitSuccess.set(true);
        if (this.toast.toast()?.type === 'error') this.toast.close();
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      if (error?.response?.status === 409) {
        this.toast.showToast(
          error.response?.data?.message ||
            'You already have an application for this association. Please track or edit it from the status page.',
          'error',
        );
      } else if (error?.response?.status === 410) {
        this.toast.showToast(REPLACED_LINK_MESSAGE, 'error');
      } else if (error?.response?.status === 400 && typeof error.response?.data?.message === 'string') {
        this.toast.showToast(error.response.data.message, 'error');
      } else {
        this.toast.showToast('Failed to submit application. Please try again.', 'error');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
