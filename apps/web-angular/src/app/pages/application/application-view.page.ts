import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApplicationProfileComponent } from '../../components/admin/application-profile';
import { applicationsApi } from '../../lib/api/applications.api';
import { formatDate } from '../../lib/utils/date';
import { ApplicantStatusBannerComponent } from './applicant-status-banner';
import { ViewLinkErrorComponent } from './view-link-error';

/**
 * /application/:token: the applicant's read-only copy of their submitted
 * application, opened from the link in their confirmation email (or one they
 * requested on the status page). Same layout as the President's page, without
 * the review notice and the Endorse / Return actions.
 */
@Component({
  selector: 'app-application-view-page',
  imports: [ApplicationProfileComponent, ApplicantStatusBannerComponent, ViewLinkErrorComponent],
  template: `
    @if (failed()) {
      <app-view-link-error />
    } @else if (application(); as app) {
      <div class="min-h-screen bg-off-white">
        <div class="max-w-[1020px] mx-auto px-4 md:px-8 py-8">
          <header class="mb-6 border-b border-border pb-5">
            <h1 class="font-serif text-[22px] sm:text-[28px] font-bold leading-tight text-navy">{{ fullName() }}</h1>
            <p class="mt-1.5 flex flex-col items-start gap-y-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 text-[13.5px] text-text-mid">
              <span class="font-mono text-navy">{{ app.referenceNumber || '-' }}</span>
              @if (app.associationName) {
                <span aria-hidden="true" class="hidden sm:inline text-border">|</span>
                <span>{{ app.associationName }}{{ app.associationCountry ? ', ' + app.associationCountry : '' }}</span>
              }
              @if (app.submittedAt) {
                <span aria-hidden="true" class="hidden sm:inline text-border">|</span>
                <span>Submitted {{ formatDate(app.submittedAt) }}</span>
              }
            </p>
          </header>

          <app-applicant-status-banner [application]="app" />

          <app-application-profile [application]="app" />
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicationViewPage implements OnInit {
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly application = signal<any>(null);
  protected readonly failed = signal(false);
  protected readonly formatDate = formatDate;

  protected readonly fullName = computed(() => {
    const app = this.application();
    return app ? [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ') : '';
  });

  constructor() {
    // The URL holds a private link, so keep the page out of search engines.
    const title = inject(Title);
    const meta = inject(Meta);
    const previousTitle = title.getTitle();
    title.setTitle('Your Application — FAFICS Expertise Pool');
    const robots = meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => {
      title.setTitle(previousTitle);
      if (robots) meta.removeTagElement(robots);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const application = await applicationsApi.getApplicantView(this.token);
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
