import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../ui/button';
import { CardComponent } from '../ui/card';

/** components/form/NotEditableMessage.tsx */
@Component({
  selector: 'app-not-editable-message',
  imports: [RouterLink, CardComponent, ButtonComponent],
  template: `
    <div class="max-w-[600px] mx-auto py-12 px-4">
      <div appCard heading="Application Locked">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-[#e8edf5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-[32px]">🔒</span>
          </div>
          <p class="text-[15px] text-text-mid mb-8">{{ message() }}</p>
          @if (status() === 'expired') {
            <a routerLink="/apply"><button appButton variant="primary">Apply again →</button></a>
          } @else {
            <a routerLink="/status"><button appButton variant="ghost">Return to Status Page</button></a>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class NotEditableMessageComponent {
  readonly status = input.required<string>();

  protected readonly message = computed(() => {
    const status = this.status();
    if (status === 'submitted') {
      return 'Your application is awaiting endorsement from your Association President. You cannot edit it at this stage.';
    } else if (status === 'endorsed' || status === 'under_review') {
      return 'Your application is currently being reviewed by the FAFICS Secretary. Editing is not available during this stage.';
    } else if (status === 'approved') {
      return 'Your application has been approved. Your profile is active in the FAFICS Expertise Pool.';
    } else if (status === 'rejected') {
      return 'Your application was not accepted at this time. Please contact secretary@fafics.org for more information.';
    } else if (status === 'expired') {
      return 'Your profile has expired. You are welcome to submit a new application.';
    }
    return 'This application cannot be edited at this time.';
  });
}
