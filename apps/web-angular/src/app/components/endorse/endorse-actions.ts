import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { endorsementApi } from '../../lib/api/endorsement.api';
import { ButtonComponent } from '../ui/button';

/** components/endorse/EndorseActions.tsx */
@Component({
  selector: 'app-endorse-actions',
  imports: [ButtonComponent],
  template: `
    @if (successType()) {
      <div class="bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm">
        <div class="w-16 h-16 bg-navy rounded-full border-[3px] border-gold flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-serif font-bold text-navy mb-2">
          {{ successType() === 'endorse' ? 'Profile Added to Expertise Pool' : 'Application Returned' }}
        </h2>
        <p class="text-text-mid">
          {{
            successType() === 'endorse'
              ? 'The applicant has been notified. Their profile is now active in the FAFICS Expertise Pool with three-year validity.'
              : 'The applicant has been notified with your comments and can revise their application.'
          }}
        </p>
      </div>
    } @else {
      <div class="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <button appButton variant="ghost" (click)="openModal('return')">Return with Comments</button>
        <button appButton (click)="openModal('endorse')" class="bg-green-600 hover:bg-green-700 text-white">
          Endorse Application
        </button>
      </div>

      @if (modalState() !== 'none') {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 class="text-xl font-serif font-bold text-navy mb-4">
              {{ modalState() === 'endorse' ? 'Confirm Endorsement' : 'Return Application' }}
            </h3>

            <p class="text-sm text-text-mid mb-4">
              {{
                modalState() === 'endorse'
                  ? "By endorsing this application, the applicant's profile will be immediately added to the FAFICS Expertise Pool with three-year validity. You may optionally leave a note."
                  : 'Please provide comments explaining why the application is being returned. These comments will be shared with the applicant.'
              }}
            </p>

            <textarea
              class="w-full border border-border rounded p-3 text-sm min-h-[120px] mb-2"
              [placeholder]="modalState() === 'endorse' ? 'Optional notes...' : 'Required comments...'"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
            ></textarea>
            @if (error()) {
              <p class="text-red-500 text-sm mb-4">{{ error() }}</p>
            }

            <div class="flex items-center justify-end gap-3 mt-4">
              <button appButton variant="ghost" (click)="modalState.set('none')" [disabled]="isSubmitting()">Cancel</button>
              <button
                appButton
                (click)="modalState() === 'endorse' ? handleEndorse() : handleReturn()"
                [disabled]="isSubmitting()"
                [class]="modalState() === 'endorse' ? 'bg-green-600 hover:bg-green-700' : ''"
              >
                {{ isSubmitting() ? 'Processing...' : modalState() === 'endorse' ? 'Endorse' : 'Return' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EndorseActionsComponent {
  readonly token = input.required<string>();

  protected readonly modalState = signal<'none' | 'endorse' | 'return'>('none');
  protected readonly notes = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly successType = signal<'endorse' | 'return' | null>(null);
  protected readonly error = signal<string | null>(null);

  protected openModal(state: 'endorse' | 'return'): void {
    this.modalState.set(state);
    this.notes.set('');
    this.error.set(null);
  }

  protected async handleEndorse(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await endorsementApi.endorse(this.token(), this.notes() || undefined);
      this.successType.set('endorse');
    } catch (err: any) {
      this.error.set(err.response?.data?.message || 'An error occurred while endorsing.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleReturn(): Promise<void> {
    if (!this.notes().trim()) {
      this.error.set('Comments are required when returning an application.');
      return;
    }
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await endorsementApi.return(this.token(), this.notes());
      this.successType.set('return');
    } catch (err: any) {
      this.error.set(err.response?.data?.message || 'An error occurred while returning.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
