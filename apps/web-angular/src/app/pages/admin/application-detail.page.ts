import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ActionButtonsComponent } from '../../components/admin/action-buttons';
import { ApplicationProfileComponent } from '../../components/admin/application-profile';
import { AuditTimelineComponent } from '../../components/admin/audit-timeline';
import { BadgeComponent } from '../../components/ui/badge';
import { CardComponent } from '../../components/ui/card';
import { adminApi } from '../../lib/api/admin.api';
import { formatDate } from '../../lib/utils/date';

/**
 * app/admin/applications/[id]/page.tsx, restructured for the Angular app (Nov
 * 2026): a full-width header, then the profile on the left and a fixed-width
 * Status & Actions column on the right, both starting at the same line. On
 * narrow screens Status & Actions comes first and the audit timeline last.
 */
@Component({
  selector: 'app-application-detail-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ActionButtonsComponent,
    ApplicationProfileComponent,
    AuditTimelineComponent,
    BadgeComponent,
    CardComponent,
  ],
  template: `
    @if (query.isLoading()) {
      <div class="p-8 text-text-light">Loading application details...</div>
    } @else if (query.isError() || !query.data()) {
      <div class="p-8 text-red-500">Failed to load application details.</div>
    } @else {
      @let app = query.data();
      <ng-template #timeline>
        <div appCard heading="Audit Timeline">
          <div class="max-h-[500px] overflow-y-auto pr-1">
            <app-audit-timeline [logs]="app.auditLogs" />
          </div>
        </div>
      </ng-template>

      <div class="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <a
          routerLink="/admin/applications"
          class="mb-5 text-[13px] font-semibold text-gold hover:text-gold-hover hover:underline inline-flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Applications
        </a>

        <!-- Page header: spans both columns so the two columns start level. -->
        <header class="mb-6 border-b border-border pb-5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="font-serif text-[22px] sm:text-[28px] font-bold leading-tight text-navy">{{ fullName(app) }}</h1>
            <span appBadge [status]="app.status"></span>
          </div>
          <p class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-text-mid">
            <span class="font-mono text-navy">{{ app.referenceNumber || 'Draft' }}</span>
            @if (app.associationName) {
              <span aria-hidden="true" class="text-border">|</span>
              <span>{{ app.associationName }}{{ app.associationCountry ? ', ' + app.associationCountry : '' }}</span>
            }
            @if (app.submittedAt) {
              <span aria-hidden="true" class="text-border">|</span>
              <span>Submitted {{ formatDate(app.submittedAt) }}</span>
            }
          </p>
        </header>

        <div class="grid grid-cols-1 items-start gap-x-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <!-- Status & actions: right column on wide screens, first on small ones. -->
          <aside class="min-w-0 xl:col-start-2 xl:row-start-1">
            <div appCard heading="Status &amp; Actions">
              <dl class="-mt-2 mb-5 divide-y divide-border">
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt [class]="labelClass">Status</dt>
                  <dd><span appBadge [status]="app.status"></span></dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt [class]="labelClass">Submitted</dt>
                  <dd [class]="valueClass">{{ app.submittedAt ? formatDate(app.submittedAt) : 'N/A' }}</dd>
                </div>
                @if (app.endorsedAt) {
                  <div class="flex items-center justify-between gap-4 py-2.5">
                    <dt [class]="labelClass">Endorsed</dt>
                    <dd [class]="valueClass">{{ formatDate(app.endorsedAt) }}</dd>
                  </div>
                }
                @if (app.approvedAt) {
                  <div class="flex items-center justify-between gap-4 py-2.5">
                    <dt [class]="labelClass">Approved</dt>
                    <dd [class]="valueClass">{{ formatDate(app.approvedAt) }}</dd>
                  </div>
                }
                @if (app.rejectedAt) {
                  <div class="flex items-center justify-between gap-4 py-2.5">
                    <dt [class]="labelClass">Rejected</dt>
                    <dd [class]="valueClass">{{ formatDate(app.rejectedAt) }}</dd>
                  </div>
                }
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt [class]="labelClass">Expires</dt>
                  <dd [class]="valueClass">{{ app.expiresAt ? formatDate(app.expiresAt) : 'N/A' }}</dd>
                </div>
              </dl>

              <app-action-buttons [applicationId]="app.id" [status]="app.status" [presidentEmail]="app.presidentEmail" />
            </div>

            <div class="hidden xl:block">
              <ng-container *ngTemplateOutlet="timeline" />
            </div>
          </aside>

          <!-- Application profile -->
          <div class="min-w-0 xl:col-start-1 xl:row-start-1">
            @if (app.presidentNotes) {
              <div class="mb-5 border border-gold bg-gold/10 p-5 rounded-theme">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">President's Comments</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.presidentNotes }}"</p>
              </div>
            }

            @if (app.secretaryNotes) {
              <div class="mb-5 border border-navy bg-navy/5 p-5 rounded-theme">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">Secretary's / Internal Notes</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.secretaryNotes }}"</p>
              </div>
            }

            @if (app.internalNotes) {
              <div class="mb-5 border border-navy bg-navy/5 p-5 rounded-theme">
                <h3 class="text-[12px] font-semibold text-navy uppercase mb-2">Internal Notes</h3>
                <p class="text-[14px] text-navy italic break-words">"{{ app.internalNotes }}"</p>
              </div>
            }

            <app-application-profile [application]="app" />

            <div class="xl:hidden">
              <ng-container *ngTemplateOutlet="timeline" />
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
  protected readonly labelClass = 'text-[11px] font-medium uppercase tracking-[0.03em] text-text-light';
  protected readonly valueClass = 'text-[14px] font-semibold text-navy';

  protected readonly query = injectQuery(() => ({
    queryKey: ['application', this.id],
    queryFn: () => adminApi.getApplication(this.id),
  }));

  protected fullName(app: any): string {
    return [app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ');
  }
}
