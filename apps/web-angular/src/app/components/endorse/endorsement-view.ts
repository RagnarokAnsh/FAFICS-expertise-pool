import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDate } from '../../lib/utils/date';
import { ApplicationProfileComponent } from '../admin/application-profile';
import { EndorseActionsComponent } from './endorse-actions';

/**
 * components/endorse/EndorsementView.tsx, restructured for the Angular app (Nov
 * 2026) to match the admin application page: a header with the applicant's
 * name, reference, association and submission date, the review notice, the
 * shared read-only profile (components/admin/application-profile.ts), then the
 * Endorse / Return actions.
 */
@Component({
  selector: 'app-endorsement-view',
  imports: [ApplicationProfileComponent, EndorseActionsComponent],
  template: `
    <div class="max-w-[1020px] mx-auto px-4 md:px-8 py-8">
      <header class="mb-6 border-b border-border pb-5">
        <h1 class="font-serif text-[22px] sm:text-[28px] font-bold leading-tight text-navy">{{ fullName() }}</h1>
        <p class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-text-mid">
          <span class="font-mono text-navy">{{ app().referenceNumber || '-' }}</span>
          @if (app().associationName) {
            <span aria-hidden="true" class="text-border">|</span>
            <span>{{ app().associationName }}{{ app().associationCountry ? ', ' + app().associationCountry : '' }}</span>
          }
          @if (app().submittedAt) {
            <span aria-hidden="true" class="text-border">|</span>
            <span>Submitted {{ formatDate(app().submittedAt) }}</span>
          }
        </p>
      </header>

      <div class="bg-gold/10 border border-gold/30 rounded-lg p-5 mb-6">
        <h2 class="text-[16px] font-serif font-bold text-navy mb-2 flex items-center gap-2">
          <svg class="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Reviewing Application
        </h2>
        <p class="text-[14px] text-text-mid">
          You are reviewing this application as <span class="font-semibold text-navy">{{ fullName() }}</span>'s
          Association President. This is a read-only view. Please review the details carefully before endorsing or
          returning with comments.
        </p>
      </div>

      <app-application-profile [application]="app()" />

      @if (token()) {
        <div class="mt-8 border-t border-border pt-8">
          <app-endorse-actions [token]="token()!" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EndorsementViewComponent {
  readonly application = input.required<any>();
  readonly token = input<string | undefined>(undefined);

  protected readonly formatDate = formatDate;
  protected readonly app = this.application;

  protected readonly fullName = computed(() =>
    [this.app().firstName, this.app().middleName, this.app().lastName].filter(Boolean).join(' '),
  );
}
