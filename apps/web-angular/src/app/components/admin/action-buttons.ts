import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { adminApi } from '../../lib/api/admin.api';
import { ButtonComponent } from '../ui/button';

type ModalType = 'approve' | 'reject' | 'requestChanges' | 'note';

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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ActionButtonsComponent {
  readonly applicationId = input.required<string>();
  readonly status = input.required<string>();

  private readonly queryClient = inject(QueryClient);
  protected readonly modalType = signal<ModalType | null>(null);
  protected readonly notes = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);

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
}
