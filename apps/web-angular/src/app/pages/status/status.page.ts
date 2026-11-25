import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button';
import { CardComponent } from '../../components/ui/card';
import { FieldComponent, InputDirective } from '../../components/ui/field';
import { ToastService } from '../../core/toast.service';
import { applicationsApi } from '../../lib/api/applications.api';
import { formatDate } from '../../lib/utils/date';

/* ─── helpers ─── */
function maskEmail(email: string) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain || local.length === 0) return email;
  return `${local[0]}***@${domain}`;
}

/** Approved profiles are valid for 3 years from the approval date. */
function computeExpiry(approvedAt: string | null | undefined): string {
  if (!approvedAt) return '—';
  const expiry = new Date(approvedAt);
  expiry.setFullYear(expiry.getFullYear() + 3);
  return formatDate(expiry);
}

const STATUS_BG: Record<string, string> = {
  submitted: '#dceeff',
  endorsed: '#EEEDFE',
  approved: '#EAF3DE',
  rejected: '#fff5f5',
  changes_requested: '#fef3cd',
  under_review: '#e8edf5',
  expired: '#f0f0f0',
};
const STATUS_FG: Record<string, string> = {
  submitted: '#185FA5',
  endorsed: '#534AB7',
  approved: '#3B6D11',
  rejected: '#c0392b',
  changes_requested: '#856404',
  under_review: '#1a3a6b',
  expired: '#666',
};

/**
 * app/status/page.tsx. The two forms follow react-hook-form's default
 * behaviour (validate on submit, then re-validate on change; focus the first
 * invalid field), and keep the browser's native email validation.
 */
@Component({
  selector: 'app-status-page',
  imports: [RouterLink, CardComponent, FieldComponent, InputDirective, ButtonComponent],
  template: `
    <div class="min-h-screen bg-off-white py-12 px-4">
      <div class="max-w-[600px] mx-auto">
        <!-- Page heading -->
        <div class="text-center mb-10">
          <h1 class="font-serif text-[32px] font-bold text-navy mb-2">Application Status</h1>
          <p class="text-[15px] text-text-mid">Track your FAFICS Expertise Pool application</p>
        </div>

        <!-- ──────────── SECTION A — Check submitted application status ──────────── -->
        <div appCard heading="Check Application Status">
          <form (submit)="submitA($event)" class="space-y-4">
            <div appField label="Email Address" required [error]="errA().email">
              <input
                #emailA
                appInput
                type="email"
                name="email"
                placeholder="your.email@example.com"
                [hasError]="!!errA().email"
                (input)="revalidateA('email')"
              />
            </div>

            <div appField label="Reference Number" required [error]="errA().referenceNumber">
              <input
                #refA
                appInput
                name="referenceNumber"
                placeholder="e.g. EP-0042"
                [hasError]="!!errA().referenceNumber"
                (input)="revalidateA('referenceNumber')"
              />
            </div>

            @if (statusError()) {
              <div class="p-3 bg-[#fff5f5] border border-danger text-danger text-[13px] rounded-lg">{{ statusError() }}</div>
            }

            <div class="pt-2">
              <button appButton type="submit" variant="submit" class="w-full" [disabled]="isCheckingStatus()">
                {{ isCheckingStatus() ? 'Checking...' : 'Check Status' }}
              </button>
            </div>
          </form>
        </div>

        <!-- ── Status result (appears below Section A) ── -->
        @if (statusResult(); as result) {
          <div class="mt-6 animate-[fadeIn_0.3s_ease]">
            <div appCard heading="Application Status">
              <div class="text-center py-6">
                <div
                  class="inline-block px-4 py-1.5 rounded-full text-[14px] font-bold tracking-wider uppercase mb-4"
                  [style.background-color]="statusBg(result.status)"
                  [style.color]="statusFg(result.status)"
                >
                  {{ result.status.replace(underscores, ' ') }}
                </div>

                <p class="text-[14px] text-navy font-semibold mb-1">Reference: {{ result.referenceNumber }}</p>

                <div class="text-left bg-off-white rounded-lg p-4 text-[13.5px] border border-border mt-4">
                  <div class="grid grid-cols-[120px_1fr] gap-2 mb-2">
                    <span class="text-text-muted font-medium">Submitted:</span>
                    <span class="text-text font-semibold">{{ formatDate(result.submittedAt) }}</span>
                  </div>
                  @if (result.endorsedAt) {
                    <div class="grid grid-cols-[120px_1fr] gap-2 mb-2">
                      <span class="text-text-muted font-medium">Endorsed:</span>
                      <span class="text-text font-semibold">{{ formatDate(result.endorsedAt) }}</span>
                    </div>
                  }
                  @if (result.approvedAt) {
                    <div class="grid grid-cols-[120px_1fr] gap-2 mb-2">
                      <span class="text-text-muted font-medium">Approved:</span>
                      <span class="text-text font-semibold">{{ formatDate(result.approvedAt) }}</span>
                    </div>
                  }
                  @if (result.status === 'submitted') {
                    <p class="mt-4 text-text-mid leading-relaxed">
                      Your application is awaiting endorsement from your Association President. You cannot edit it at this
                      stage.
                    </p>
                  }
                  @if (result.status === 'endorsed' || result.status === 'under_review') {
                    <p class="mt-4 text-text-mid leading-relaxed">
                      Your application has been endorsed by your Association President. Editing is not available at this
                      stage.
                    </p>
                  }
                  @if (result.status === 'approved') {
                    <p class="mt-4 text-text-mid leading-relaxed">
                      Your application has been approved. Your profile is active in the FAFICS Expertise Pool until
                      {{ computeExpiry(result.approvedAt) }}. After that date you can submit a new application to stay in the
                      pool.
                    </p>
                  }
                  @if (result.status === 'rejected') {
                    <p class="mt-4 text-text-mid leading-relaxed">
                      Your application was not accepted at this time. Please contact support&#64;fafics.com for more
                      information.
                    </p>
                  }
                  @if (result.status === 'expired') {
                    <div class="mt-4 text-text-mid leading-relaxed">
                      <p>Your profile has expired. You are welcome to submit a new application.</p>
                      <a routerLink="/apply" class="text-gold font-semibold hover:underline mt-2 inline-block">Apply again →</a>
                    </div>
                  }
                </div>

                <!-- Edit link section for draft / changes_requested -->
                @if (result.status === 'draft' || result.status === 'changes_requested') {
                  <div class="mt-6 border-t border-border pt-6 text-left">
                    <div class="flex items-center gap-2 mb-3">
                      <span class="text-[20px]">✏️</span>
                      <h3 class="font-serif text-[18px] font-bold text-navy">Continue editing your application</h3>
                    </div>

                    @if (result.status === 'changes_requested') {
                      <p class="text-[14px] text-text-mid mb-5">
                        Your Association President has returned your application with comments. Open the editing link sent
                        to your email to see their feedback and make the requested changes.
                      </p>
                    } @else {
                      <p class="text-[14px] text-text-mid mb-5">
                        Your application has not been submitted yet. Click below to continue where you left off.
                      </p>
                    }

                    @if (editLinkSent()) {
                      <div class="p-4 bg-[#eaf3de] text-[#3b6d11] rounded-lg text-[14px] font-medium border border-[#c4e1a4]">
                        ✓ Editing link sent! Check your email inbox (and spam folder). The link is valid for 3 hours.
                      </div>
                    } @else {
                      <button
                        appButton
                        (click)="handleRequestEditLink()"
                        [disabled]="isSendingEditLink()"
                        class="bg-gold hover:bg-[#d49925] text-white"
                      >
                        {{ isSendingEditLink() ? 'Sending...' : 'Send me an editing link' }}
                      </button>
                      @if (queryEmail()) {
                        <p class="text-[13px] text-text-muted mt-3">
                          A secure link will be sent to: {{ maskEmail(queryEmail()!) }}
                        </p>
                      }
                    }
                  </div>
                }

                <!-- View link section for any submitted application -->
                @if (result.status !== 'draft') {
                  <div class="mt-6 border-t border-border pt-6 text-left">
                    <h3 class="font-serif text-[18px] font-bold text-navy mb-3">View your submitted application</h3>
                    <p class="text-[14px] text-text-mid mb-5">
                      We can email you a secure link to a read-only copy of the application you submitted.
                    </p>

                    @if (viewLinkSent()) {
                      <div class="p-4 bg-[#eaf3de] text-[#3b6d11] rounded-lg text-[14px] font-medium border border-[#c4e1a4]">
                        ✓ Link sent! Check your email inbox (and spam folder).
                      </div>
                    } @else {
                      <button
                        appButton
                        variant="ghost"
                        (click)="handleRequestViewLink()"
                        [disabled]="isSendingViewLink()"
                        class="border-navy text-navy hover:bg-navy hover:text-white"
                      >
                        {{ isSendingViewLink() ? 'Sending...' : 'Email me a link to view my application' }}
                      </button>
                      @if (queryEmail()) {
                        <p class="text-[13px] text-text-muted mt-3">
                          A secure link will be sent to: {{ maskEmail(queryEmail()!) }}
                        </p>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ──────────── OR divider ──────────── -->
        <div class="flex items-center gap-4 my-10">
          <div class="flex-1 h-px bg-border"></div>
          <span class="text-[14px] font-bold text-text-muted tracking-wider">— OR —</span>
          <div class="flex-1 h-px bg-border"></div>
        </div>

        <!-- ──────────── SECTION B — Retrieve a saved draft ──────────── -->
        <div class="bg-navy-light border border-navy/10 rounded-theme p-8 shadow-theme">
          <div class="flex items-start gap-4 mb-5">
            <!-- FileText icon -->
            <div class="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center shrink-0 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="w-5 h-5 text-navy"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            </div>
            <div>
              <h2 class="font-serif text-[20px] font-bold text-navy mb-1">Retrieve a saved draft</h2>
              <p class="text-[14px] text-text-mid leading-relaxed">
                If you started an application but haven't submitted it yet, enter your email address and we'll send you a
                link to continue where you left off.
              </p>
            </div>
          </div>

          @if (draftLinkSent()) {
            <div class="space-y-3">
              <div class="p-4 bg-[#eaf3de] text-[#3b6d11] rounded-lg text-[14px] font-medium border border-[#c4e1a4]">
                ✓ Link sent! Check your inbox (including spam folder). The link is valid for 30 days.
              </div>
              @if (sendAgainTimer() > 0) {
                <p class="text-[13px] text-text-muted text-center">You can send again in {{ sendAgainTimer() }}s</p>
              } @else {
                <button type="button" (click)="handleSendAgain()" class="text-[13px] text-navy font-semibold hover:underline block mx-auto">
                  Send again
                </button>
              }
            </div>
          } @else {
            <form (submit)="submitB($event)" class="space-y-4">
              <div appField label="Email Address" required [error]="errB().email">
                <input
                  #emailB
                  appInput
                  type="email"
                  name="email"
                  placeholder="your.email@example.com"
                  [hasError]="!!errB().email"
                  [value]="emailBValue()"
                  (input)="emailBValue.set($any($event.target).value); revalidateB()"
                />
              </div>

              @if (draftError()) {
                <div class="p-3 bg-[#fff5f5] border border-danger text-danger text-[13px] rounded-lg">{{ draftError() }}</div>
              }

              <button
                appButton
                type="submit"
                variant="ghost"
                class="w-full border-navy text-navy hover:bg-navy hover:text-white"
                [disabled]="isDraftSending()"
              >
                @if (isDraftSending()) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </span>
                } @else {
                  Send me my draft link
                }
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class StatusPage {
  private readonly toast = inject(ToastService);
  protected readonly formatDate = formatDate;
  protected readonly computeExpiry = computeExpiry;
  protected readonly maskEmail = maskEmail;
  protected readonly underscores = /_/g;

  private readonly emailA = viewChild.required<ElementRef<HTMLInputElement>>('emailA');
  private readonly refA = viewChild.required<ElementRef<HTMLInputElement>>('refA');
  private readonly emailB = viewChild<ElementRef<HTMLInputElement>>('emailB');

  /* ── Section A state ── */
  protected readonly errA = signal<{ email?: string; referenceNumber?: string }>({});
  private submittedA = false;
  protected readonly statusResult = signal<any>(null);
  protected readonly statusError = signal<string | null>(null);
  protected readonly isCheckingStatus = signal(false);
  // edit-link state (for submitted apps returned with changes_requested)
  protected readonly isSendingEditLink = signal(false);
  protected readonly editLinkSent = signal(false);
  protected readonly queryEmail = signal<string | null>(null);
  // view-link state (read-only copy of a submitted application)
  protected readonly isSendingViewLink = signal(false);
  protected readonly viewLinkSent = signal(false);

  /* ── Section B state ── */
  protected readonly errB = signal<{ email?: string }>({});
  // react-hook-form keeps a field's value when its input unmounts ("Send again"
  // brings back the email the applicant typed).
  protected readonly emailBValue = signal('');
  private submittedB = false;
  protected readonly isDraftSending = signal(false);
  protected readonly draftLinkSent = signal(false);
  protected readonly draftError = signal<string | null>(null);
  protected readonly sendAgainTimer = signal(0);

  constructor() {
    /* ── countdown for "send again" ── */
    const destroyRef = inject(DestroyRef);
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const remaining = this.sendAgainTimer();
      clearTimeout(timer);
      if (remaining <= 0) return;
      timer = setTimeout(() => this.sendAgainTimer.update((v) => v - 1), 1000);
    });
    destroyRef.onDestroy(() => clearTimeout(timer));
  }

  protected statusBg(status: string): string {
    return STATUS_BG[status] ?? '#f0f0f0';
  }

  protected statusFg(status: string): string {
    return STATUS_FG[status] ?? '#666';
  }

  // react-hook-form `required` rules, validated on submit then on every change.
  private validateA(): { email?: string; referenceNumber?: string } {
    const errors: { email?: string; referenceNumber?: string } = {};
    if (this.emailA().nativeElement.value === '') errors.email = 'Email is required';
    if (this.refA().nativeElement.value === '') errors.referenceNumber = 'Reference number is required';
    return errors;
  }

  protected revalidateA(field: 'email' | 'referenceNumber'): void {
    if (!this.submittedA) return;
    const errors = this.validateA();
    this.errA.update((current) => ({ ...current, [field]: errors[field] }));
  }

  protected submitA(event: Event): void {
    event.preventDefault();
    this.submittedA = true;
    const errors = this.validateA();
    this.errA.set(errors);
    if (errors.email) {
      this.emailA().nativeElement.focus();
      return;
    }
    if (errors.referenceNumber) {
      this.refA().nativeElement.focus();
      return;
    }
    this.onCheckStatus({
      email: this.emailA().nativeElement.value,
      referenceNumber: this.refA().nativeElement.value,
    });
  }

  /* ── Section A: check submitted application status ── */
  private async onCheckStatus(data: { referenceNumber: string; email: string }): Promise<void> {
    this.isCheckingStatus.set(true);
    this.statusError.set(null);
    this.statusResult.set(null);
    this.editLinkSent.set(false);
    this.viewLinkSent.set(false);
    this.queryEmail.set(data.email);

    try {
      const result = await applicationsApi.getStatus(data.email, data.referenceNumber);
      this.statusResult.set(result);
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.statusError.set(
          'No application found with that email and reference number. Note: reference numbers are only assigned after submission. If your application is still a draft, use the section below.',
        );
      } else {
        this.statusError.set('An error occurred while checking status. Please try again later.');
      }
    } finally {
      this.isCheckingStatus.set(false);
    }
  }

  protected async handleRequestEditLink(): Promise<void> {
    const result = this.statusResult();
    const queryEmail = this.queryEmail();
    if (!result || !result.referenceNumber || !queryEmail) return;
    this.isSendingEditLink.set(true);
    try {
      await applicationsApi.requestEditLink(queryEmail, result.referenceNumber);
      this.editLinkSent.set(true);
    } catch (error: any) {
      this.toast.showToast('An error occurred. Please try again.', 'error');
    } finally {
      this.isSendingEditLink.set(false);
    }
  }

  protected async handleRequestViewLink(): Promise<void> {
    const result = this.statusResult();
    const queryEmail = this.queryEmail();
    if (!result || !result.referenceNumber || !queryEmail) return;
    this.isSendingViewLink.set(true);
    try {
      await applicationsApi.requestViewLink(queryEmail, result.referenceNumber);
      this.viewLinkSent.set(true);
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.toast.showToast('Too many requests. Please wait a minute and try again.', 'error');
      } else {
        this.toast.showToast('An error occurred. Please try again.', 'error');
      }
    } finally {
      this.isSendingViewLink.set(false);
    }
  }

  protected revalidateB(): void {
    if (!this.submittedB) return;
    const value = this.emailB()?.nativeElement.value ?? '';
    this.errB.set(value === '' ? { email: 'Email is required' } : {});
  }

  protected submitB(event: Event): void {
    event.preventDefault();
    this.submittedB = true;
    const input = this.emailB()?.nativeElement;
    const value = input?.value ?? '';
    if (value === '') {
      this.errB.set({ email: 'Email is required' });
      input?.focus();
      return;
    }
    this.errB.set({});
    this.onRequestDraftLink(value);
  }

  /* ── Section B: request draft link ── */
  private async onRequestDraftLink(email: string): Promise<void> {
    this.isDraftSending.set(true);
    this.draftError.set(null);
    try {
      await applicationsApi.requestDraftLink(email);
      this.draftLinkSent.set(true);
      this.sendAgainTimer.set(60);
    } catch (error: any) {
      this.draftError.set('Something went wrong. Please try again.');
    } finally {
      this.isDraftSending.set(false);
    }
  }

  protected handleSendAgain(): void {
    this.draftLinkSent.set(false);
    this.draftError.set(null);
  }
}
