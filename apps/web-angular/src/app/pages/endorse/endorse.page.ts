import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EndorsementViewComponent } from '../../components/endorse/endorsement-view';
import { endorsementApi } from '../../lib/api/endorsement.api';
import { TokenErrorComponent } from './token-error';

/**
 * app/endorse/[token]/page.tsx. The Next.js page fetched on the server; here
 * the request runs once in the browser. Every failure shows TokenError, as the
 * server page (and its error boundary, which is TokenError too) did.
 *
 * Fetched exactly once — no refetching: after the president endorses, the
 * token is used up and a refetch would replace the success message.
 */
@Component({
  selector: 'app-endorse-page',
  imports: [EndorsementViewComponent, TokenErrorComponent],
  template: `
    @if (failed()) {
      <app-token-error />
    } @else if (application(); as app) {
      <div class="min-h-screen bg-off-white">
        <app-endorsement-view [application]="app" [token]="token" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EndorsePage implements OnInit {
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly application = signal<any>(null);
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const application = await endorsementApi.getApplication(this.token);
      if (!application) {
        this.failed.set(true);
        return;
      }
      this.application.set(application);
    } catch {
      this.failed.set(true);
    }
  }
}
