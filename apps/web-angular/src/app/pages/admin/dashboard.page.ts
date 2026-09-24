import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DistributionPieChartComponent, ExpertiseBarChartComponent } from '../../components/admin/charts/charts';
import { ReportCardComponent, StatusBadgeComponent } from '../../components/admin/ui';
import { adminApi } from '../../lib/api/admin.api';
import { formatDate } from '../../lib/utils/date';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Pending Endorsement',
  endorsed: 'Pending Review',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#3E6CA6', // blue
  submitted: '#EAB308', // yellow — pending endorsement
  endorsed: '#D97706', // orange — pending review
  under_review: '#7B5AA6', // purple
  changes_requested: '#D6608F', // pink
  approved: '#4B9E6B', // green
  rejected: '#C0504D', // red
  expired: '#94A3B8', // gray
};

function initials(first: string, last: string) {
  return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();
}

function activityLine(app: any): string {
  const assoc = app.associationName ?? '';
  switch (app.status) {
    case 'approved':
      return `Added to the Expertise Pool · ${assoc}`;
    case 'submitted':
      return `Submitted — awaiting endorsement · ${assoc}`;
    case 'endorsed':
      return `Endorsed — pending review · ${assoc}`;
    case 'changes_requested':
      return `Changes requested · ${assoc}`;
    default:
      return assoc;
  }
}

/** app/admin/dashboard/page.tsx */
@Component({
  selector: 'app-dashboard-page',
  imports: [ReportCardComponent, StatusBadgeComponent, DistributionPieChartComponent, ExpertiseBarChartComponent],
  template: `
    @if (statsQ.isLoading()) {
      <div class="flex min-h-[50vh] items-center justify-center text-text-muted">Loading dashboard…</div>
    } @else if (statsQ.isError() || !statsQ.data()) {
      <div class="flex min-h-[50vh] items-center justify-center text-danger">Failed to load dashboard statistics.</div>
    } @else {
      <div class="mx-auto max-w-[1200px] p-6">
        <!-- Distribution pie charts -->
        <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div appReportCard heading="Application Status">
            <app-distribution-pie-chart [data]="statusData()" [labelMap]="statusLabels" [colorMap]="statusColors" />
          </div>
          <div appReportCard heading="Nationalities">
            @if (analyticsQ.isLoading()) {
              <div class="h-64 animate-pulse rounded bg-off-white"></div>
            } @else {
              <app-distribution-pie-chart [data]="analyticsQ.data()?.nationalityBreakdown ?? []" />
            }
          </div>
          <div appReportCard heading="Gender">
            @if (analyticsQ.isLoading()) {
              <div class="h-64 animate-pulse rounded bg-off-white"></div>
            } @else {
              <app-distribution-pie-chart [data]="analyticsQ.data()?.genderBalance ?? []" [labelMap]="genderLabels" />
            }
          </div>
        </div>

        <!-- Expertise areas -->
        <div class="mb-5">
          <div appReportCard heading="Expertise Areas — Experts per Category">
            @if (analyticsQ.isLoading()) {
              <div class="h-64 animate-pulse rounded bg-off-white"></div>
            } @else {
              <app-expertise-bar-chart [data]="analyticsQ.data()?.expertiseDistribution ?? []" />
            }
          </div>
        </div>

        <!-- Recent activity -->
        <div appReportCard heading="Recent Activity">
          @if (recent().length === 0) {
            <p class="py-6 text-center text-[13px] text-text-muted">No recent activity.</p>
          } @else {
            <div>
              @for (app of recent(); track app.id) {
                <div class="flex items-center gap-3 border-b border-border py-2.5 last:border-none">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11.5px] font-bold text-white"
                  >
                    {{ initials(app.firstName, app.lastName) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[13px] font-semibold text-text">{{ app.firstName }} {{ app.lastName }}</div>
                    <div class="truncate text-[11.5px] text-text-muted">{{ activityLine(app) }}</div>
                  </div>
                  <div class="hidden text-[11px] text-text-muted sm:block">
                    {{ formatDate(app.approvedAt ?? app.submittedAt ?? null) }}
                  </div>
                  <span appStatusBadge [status]="app.status"></span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DashboardPage {
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusColors = STATUS_COLORS;
  protected readonly genderLabels = GENDER_LABELS;
  protected readonly initials = initials;
  protected readonly activityLine = activityLine;
  protected readonly formatDate = formatDate;

  protected readonly statsQ = injectQuery(() => ({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 60000,
  }));
  protected readonly analyticsQ = injectQuery(() => ({ queryKey: ['analytics'], queryFn: adminApi.getAnalytics }));
  protected readonly recentQ = injectQuery(() => ({
    queryKey: ['recent-activity'],
    queryFn: () => adminApi.listApplications({ limit: 7 }),
  }));

  protected readonly recent = computed<any[]>(() => this.recentQ.data()?.data ?? []);

  protected readonly statusData = computed(() => {
    const stats = this.statsQ.data();
    if (!stats) return [];
    return [
      { label: 'draft', count: stats.drafts ?? 0 },
      { label: 'submitted', count: stats.pendingEndorsement ?? 0 },
      { label: 'endorsed', count: stats.pendingReview ?? 0 },
      { label: 'under_review', count: stats.underReview ?? 0 },
      { label: 'changes_requested', count: stats.changesRequested ?? 0 },
      { label: 'approved', count: stats.activeInPool ?? 0 },
      { label: 'rejected', count: stats.rejected ?? 0 },
      { label: 'expired', count: stats.expired ?? 0 },
    ].filter((d) => d.count > 0);
  });
}
