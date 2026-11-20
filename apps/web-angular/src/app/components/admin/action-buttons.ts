import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { ToastService } from '../../core/toast.service';
import { adminApi } from '../../lib/api/admin.api';
import { ButtonComponent } from '../ui/button';

type ModalType = 'approve' | 'reject' | 'requestChanges' | 'note';
type PresidentDialog = 'resend' | 'editEmail';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** components/admin/ActionButtons.tsx */
@Component({
  selector: 'app-action-buttons',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-col gap-3">
      @if (status() === 'endorsed' || status() === 'under_review') {
        <button
          appButton
          (click)="modalType.set('approve')"
          class="bg-green-600 hover:bg-green-700 text-white w-full text-left justify-start"
        >
          ✓ Approve Application
        </button>
        <button
          appButton
          (click)="modalType.set('requestChanges')"
          class="bg-amber-600 hover:bg-amber-700 text-white w-full text-left justify-start"
        >
          ↻ Request Changes
        </button>
        <button
          appButton
          (click)="modalType.set('reject')"
          class="bg-red-600 hover:bg-red-700 text-white w-full text-left justify-start"
        >
          ✗ Reject Application
        </button>
      }

      @if (status() === 'changes_requested') {
        <div class="bg-amber-50 text-amber-800 p-4 rounded text-sm mb-2 border border-amber-100">
          <strong>Awaiting Resubmission</strong><br />The applicant has been asked to make changes and resubmit.
        </div>
      }

      @if (status() === 'approved') {
        <div class="bg-green-50 text-green-800 p-4 rounded text-sm mb-2 border border-green-100">
          <strong>Active in Pool</strong><br />This application has been fully approved.
        </div>
      }

      @if (status() === 'submitted') {
        <div class="bg-blue-50 text-blue-800 p-4 rounded text-sm mb-2 border border-blue-100">
          <strong>Awaiting President Endorsement</strong><br />Sent to
          <span class="break-all">{{ presidentEmail() }}</span>. Reminders go out automatically 3 and 7 days after
          submission.
        </div>
        <button
          appButton
          (click)="openPresidentDialog('resend')"
          class="bg-navy hover:bg-navy-hover text-white w-full text-left justify-start"
        >
          ✉ Resend to President
        </button>
      }

      @if (status() !== 'draft') {
        <button appButton variant="ghost" (click)="openPresidentDialog('editEmail')" class="w-full text-left justify-start">
          ✎ Edit President Email
        </button>
      }

      <button appButton variant="ghost" (click)="modalType.set('note')" class="w-full text-left justify-start">
        + Add Internal Note
      </button>
    </div>

    @if (modalType() && config(); as c) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-lg w-full p-6">
          <h3 class="text-xl font-serif font-bold text-navy mb-4">{{ c.title }}</h3>
          <p class="text-sm text-text-mid mb-4">{{ c.desc }}</p>

          <textarea
            class="w-full border border-border rounded p-3 text-sm min-h-[120px] mb-2"
            [value]="notes()"
            (input)="notes.set($any($event.target).value)"
          ></textarea>
          @if (error()) {
            <p class="text-red-500 text-sm mb-4">{{ error() }}</p>
          }

          <div class="flex items-center justify-end gap-3 mt-4">
            <button appButton variant="ghost" (click)="modalType.set(null)" [disabled]="isSubmitting()">Cancel</button>
            <button appButton (click)="handleAction()" [disabled]="isSubmitting()" [class]="c.btnClass">
              {{ isSubmitting() ? 'Processing...' : c.btnText }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (presidentDialog() === 'resend') {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-lg w-full p-6" role="dialog" aria-modal="true" aria-labelledby="resend-title">
          <h3 id="resend-title" class="text-xl font-serif font-bold text-navy mb-4">Resend to President?</h3>
          <p class="text-sm text-text-mid mb-2">This will immediately email the endorsement request, with a new link, to:</p>
          <p class="text-[15px] font-semibold text-navy break-all mb-4">{{ presidentEmail() }}</p>
          <p class="rounded border border-gold/30 bg-gold/5 p-3 text-[12.5px] text-text-mid mb-2">
            Links sent earlier keep working. If this address is wrong, cancel and use
            <strong>Edit President Email</strong> instead.
          </p>
          @if (presidentError()) {
            <p class="text-red-500 text-sm mb-4">{{ presidentError() }}</p>
          }

          <div class="flex items-center justify-end gap-3 mt-4">
            <button appButton variant="ghost" (click)="closePresidentDialog()" [disabled]="presidentBusy()">Cancel</button>
            <button
              appButton
              (click)="handleResend()"
              [disabled]="presidentBusy()"
              class="bg-navy hover:bg-navy-hover text-white"
            >
              {{ presidentBusy() ? 'Sending...' : 'Send Email' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (presidentDialog() === 'editEmail') {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <form
          class="bg-white rounded-lg max-w-lg w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-president-title"
          (submit)="handleSaveEmail($event)"
          novalidate
        >
          <h3 id="edit-president-title" class="text-xl font-serif font-bold text-navy mb-4">Edit President Email</h3>
          <label for="president-email-input" class="block text-[11px] text-text-light font-medium uppercase mb-1"
            >President Email <span class="text-gold ml-0.5">*</span></label
          >
          <input
            id="president-email-input"
            type="email"
            autocomplete="off"
            [value]="emailDraft()"
            (input)="emailDraft.set($any($event.target).value)"
            class="w-full border border-border rounded p-2 text-sm mb-2"
          />
          @if (presidentError()) {
            <p class="text-red-500 text-sm mb-2">{{ presidentError() }}</p>
          }
          @if (status() === 'submitted') {
            <p class="rounded border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800 mt-2">
              Saving will <strong>immediately email a new endorsement link</strong> to this address. Links sent to the
              old address will stop working.
            </p>
          } @else {
            <p class="text-[12.5px] text-text-light mt-2">
              No email will be sent: this application is no longer awaiting the President's endorsement.
            </p>
          }

          <div class="flex items-center justify-end gap-3 mt-6">
            <button appButton variant="ghost" type="button" (click)="closePresidentDialog()" [disabled]="presidentBusy()">
              Cancel
            </button>
            <button appButton type="submit" [disabled]="presidentBusy()" class="bg-navy hover:bg-navy-hover text-white">
              {{ presidentBusy() ? 'Saving...' : status() === 'submitted' ? 'Save & Send Email' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ActionButtonsComponent {
  readonly applicationId = input.required<string>();
  readonly status = input.required<string>();
  readonly presidentEmail = input<string>('');

  private readonly queryClient = inject(QueryClient);
  private readonly toast = inject(ToastService);
  protected readonly modalType = signal<ModalType | null>(null);
  protected readonly notes = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);

  // Resend to President / Edit President Email
  protected readonly presidentDialog = signal<PresidentDialog | null>(null);
  protected readonly emailDraft = signal('');
  protected readonly presidentBusy = signal(false);
  protected readonly presidentError = signal<string | null>(null);

  protected readonly config = computed(() => {
    switch (this.modalType()) {
      case 'approve':
        return {
          title: 'Approve Application',
          desc: 'Optional notes for the applicant:',
          btnClass: 'bg-green-600 hover:bg-green-700 text-white',
          btnText: 'Approve',
        };
      case 'reject':
        return {
          title: 'Reject Application',
          desc: 'Required reason for rejection (shared with applicant):',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white',
          btnText: 'Reject',
        };
      case 'requestChanges':
        return {
          title: 'Request Changes',
          desc: 'Required explanation of what needs to be changed (shared with applicant):',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          btnText: 'Request Changes',
        };
      case 'note':
        return {
          title: 'Add Internal Note',
          desc: 'Notes are only visible to officers.',
          btnClass: 'bg-navy hover:bg-navy-hover text-white',
          btnText: 'Save Note',
        };
      default:
        return null;
    }
  });

  protected async handleAction(): Promise<void> {
    const modalType = this.modalType();
    const notes = this.notes();
    const applicationId = this.applicationId();
    if ((modalType === 'reject' || modalType === 'requestChanges' || modalType === 'note') && !notes.trim()) {
      this.error.set('Notes are required for this action.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      if (modalType === 'approve') await adminApi.approve(applicationId, notes);
      else if (modalType === 'reject') await adminApi.reject(applicationId, notes);
      else if (modalType === 'requestChanges') await adminApi.requestChanges(applicationId, notes);
      else if (modalType === 'note') await adminApi.addNotes(applicationId, notes);

      // Invalidate queries to refresh data
      this.queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      this.queryClient.invalidateQueries({ queryKey: ['applications'] });
      this.queryClient.invalidateQueries({ queryKey: ['admin-stats'] });

      this.modalType.set(null);
      this.notes.set('');
    } catch (err: any) {
      this.error.set(err.response?.data?.message || 'An error occurred while performing the action.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
  protected openPresidentDialog(dialog: PresidentDialog): void {
    this.presidentError.set(null);
    this.emailDraft.set(this.presidentEmail());
    this.presidentDialog.set(dialog);
  }

  protected closePresidentDialog(): void {
    this.presidentDialog.set(null);
    this.presidentError.set(null);
  }

  private refreshApplication(): void {
    this.queryClient.invalidateQueries({ queryKey: ['application', this.applicationId()] });
    this.queryClient.invalidateQueries({ queryKey: ['applications'] });
  }

  protected async handleResend(): Promise<void> {
    if (this.presidentBusy()) return;
    this.presidentBusy.set(true);
    this.presidentError.set(null);
    try {
      const result = await adminApi.resendPresidentLink(this.applicationId());
      this.toast.showToast(`Endorsement email sent to ${result.presidentEmail}.`, 'success');
      this.presidentDialog.set(null);
      this.refreshApplication();
    } catch (err: any) {
      this.presidentError.set(apiMessage(err, 'The email could not be sent. Please try again.'));
    } finally {
      this.presidentBusy.set(false);
    }
  }

  protected async handleSaveEmail(event: Event): Promise<void> {
    event.preventDefault();
    if (this.presidentBusy()) return;
    const email = this.emailDraft().trim();
    if (!email) {
      this.presidentError.set('President Email is required');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      this.presidentError.set('Invalid email');
      return;
    }

    this.presidentBusy.set(true);
    this.presidentError.set(null);
    try {
      const result = await adminApi.updatePresidentEmail(this.applicationId(), email);
      if (this.status() !== 'submitted') {
        this.toast.showToast('President email updated.', 'success');
      } else if (result.linkSent) {
        this.toast.showToast(`President email updated. Endorsement email sent to ${result.presidentEmail}.`, 'success');
      } else {
        this.toast.showToast(
          'President email updated, but the endorsement email could not be sent. Use Resend to President to try again.',
          'error',
        );
      }
      this.presidentDialog.set(null);
      this.refreshApplication();
    } catch (err: any) {
      this.presidentError.set(apiMessage(err, 'Failed to update the President email.'));
    } finally {
      this.presidentBusy.set(false);
    }
  }
}

/** Pulls a readable message out of a NestJS error, which may be a string or an array. */
function apiMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (Array.isArray(raw)) return raw.join(' ');
  return raw || fallback;
}
