import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ActionButtonsComponent } from '../../components/admin/action-buttons';
import { AuditTimelineComponent } from '../../components/admin/audit-timeline';
import { EndorsementViewComponent } from '../../components/endorse/endorsement-view';
import { BadgeComponent } from '../../components/ui/badge';
import { CardComponent } from '../../components/ui/card';
import { adminApi } from '../../lib/api/admin.api';
import { formatDate } from '../../lib/utils/date';

/** app/admin/applications/[id]/page.tsx */
@Component({
  selector: 'app-application-detail-page',
  imports: [RouterLink, ActionButtonsComponent, AuditTimelineComponent, EndorsementViewComponent, BadgeComponent, CardComponent],
  template: `
    @if (query.isLoading()) {
      <div class="p-8 text-text-light">Loading application details...</div>
    } @else if (query.isError() || !query.data()) {
      <div class="p-8 text-red-500">Failed to load application details.</div>
    } @else {
      @let app = query.data();
      <div class="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div class="mb-6">
          <a
            routerLink="/admin/applications"
            class="text-[13px] font-semibold text-gold hover:text-gold-hover hover:underline inline-flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Applications
          </a>
        </div>

        <div class="flex flex-col xl:flex-row gap-8">
          <!-- Left Column - Application Profile -->
          <div class="flex-1 xl:w-2/3">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h1 class="font-serif text-[22px] sm:text-[28px] font-bold text-navy">{{ fullName(app) }}</h1>
                <p class="text-text-mid font-mono text-[14px]">{{ app.referenceNumber }}</p>
              </div>
              <div class="xl:hidden">
                <span appBadge [status]="app.status"></span>
              </div>
            </div>

            @if (app.presidentNotes) {
              <div class="mb-6 border border-gold bg-gold/10 p-5 rounded-lg">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">President's Comments</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.presidentNotes }}"</p>
              </div>
            }

            @if (app.secretaryNotes) {
              <div class="mb-6 border border-navy bg-navy/5 p-5 rounded-lg">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">Secretary's / Internal Notes</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.secretaryNotes }}"</p>
              </div>
            }

            @if (app.internalNotes) {
              <div class="mb-6 border border-navy bg-navy/5 p-5 rounded-lg">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">Internal Notes</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.internalNotes }}"</p>
              </div>
            }

            <app-endorsement-view [application]="app" [isAdminView]="true" />
          </div>

          <!-- Right Column - Actions & Audit -->
          <div class="w-full xl:w-1/3 xl:min-w-[350px]">
            <div class="sticky top-24">
              <div class="bg-white border border-border rounded-lg shadow-sm p-6 mb-6">
                <div class="mb-4">
                  <span class="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-2"
                    >Current Status</span
                  >
                  <span appBadge [status]="app.status"></span>
                </div>

                <div class="mb-6">
                  <span class="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1">Expiration</span>
                  <div class="text-[14px] text-navy font-semibold">
                    {{ app.expiresAt ? formatDate(app.expiresAt) : 'N/A' }}
                  </div>
                </div>

                <app-action-buttons [applicationId]="app.id" [status]="app.status" />
              </div>

              <div appCard heading="Audit Timeline">
                <div class="max-h-[500px] overflow-y-auto pr-1">
                  <app-audit-timeline [logs]="app.auditLogs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplicationDetailPage {
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly formatDate = formatDate;

  protected readonly query = injectQuery(() => ({
    queryKey: ['application', this.id],
    queryFn: () => adminApi.getApplication(this.id),
  }));

  protected fullName(app: any): string {
    return [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ');
  }
}
