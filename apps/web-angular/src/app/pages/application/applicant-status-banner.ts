import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../components/ui/badge';
import { formatDate } from '../../lib/utils/date';

/** Top of the applicant's read-only page: status badge and what it means. */
@Component({
  selector: 'app-applicant-status-banner',
  imports: [RouterLink, BadgeComponent],
  template: `
    <div class="bg-navy-light border border-navy/10 rounded-lg p-5 mb-6">
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <h2 class="text-[16px] font-serif font-bold text-navy">Your submitted application</h2>
        <span appBadge [status]="status()"></span>
      </div>
      <p class="text-[14px] text-text-mid mb-2">
        This is a read-only copy of the application you submitted. You cannot make changes on this page.
      </p>
      @switch (status()) {
        @case ('submitted') {
          <p class="text-[14px] text-text-mid">Your application is awaiting endorsement from your Association President.</p>
        }
        @case ('changes_requested') {
          <p class="text-[14px] text-text-mid">
            Your application was returned to you for changes. Use the editing link in your email to update it, or request
            a new one from the
            <a routerLink="/status" class="text-navy font-semibold hover:underline">Application Status page</a>.
          </p>
        }
        @case ('endorsed') {
          <p class="text-[14px] text-text-mid">Your application has been endorsed by your Association President.</p>
        }
        @case ('under_review') {
          <p class="text-[14px] text-text-mid">Your application has been endorsed by your Association President.</p>
        }
        @case ('approved') {
          <p class="text-[14px] text-text-mid">
            Your application has been approved.
            @if (expiresAt()) {
              Your profile is active in the FAFICS Expertise Pool until {{ formatDate(expiresAt()) }}.
            } @else {
              Your profile is active in the FAFICS Expertise Pool.
            }
          </p>
        }
        @case ('rejected') {
          <p class="text-[14px] text-text-mid">
            Your application was not accepted at this time. Please contact support&#64;fafics.com for more information.
          </p>
        }
        @case ('expired') {
          <p class="text-[14px] text-text-mid">
            Your profile has expired. You are welcome to
            <a routerLink="/apply" class="text-navy font-semibold hover:underline">submit a new application</a>.
          </p>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicantStatusBannerComponent {
  readonly application = input.required<any>();

  protected readonly formatDate = formatDate;
  protected readonly status = computed(() => this.application().status ?? '');
  protected readonly expiresAt = computed(() => this.application().expiresAt ?? null);
}
