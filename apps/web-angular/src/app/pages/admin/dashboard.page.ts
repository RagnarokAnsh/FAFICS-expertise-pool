import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DistributionPieChartComponent, ExpertiseBarChartComponent } from '../../components/admin/charts/charts';
import { ReportCardComponent, StatusBadgeComponent } from '../../components/admin/ui';
import { WAITING_WARN_DAYS, WaitingFlagComponent, daysWaiting } from '../../components/admin/waiting-flag';
import { adminApi } from '../../lib/api/admin.api';
import { canReview, currentRole } from '../../lib/auth/roles';
import { formatDate } from '../../lib/utils/date';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting President',
  endorsed: 'Endorsed',
  under_review: 'Under Review',
  changes_requested: 'Returned for Changes',
  approved: 'Active in Pool',
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
  imports: [ReportCardComponent, StatusBadgeComponent, DistributionPieChartComponent, ExpertiseBarChartComponent, RouterLink, WaitingFlagComponent],
  template: `
    @if (statsQ.isLoading()) {
      <div class="flex min-h-[50vh] items-center justify-center text-text-muted">Loading dashboard…</div>
    } @else if (statsQ.isError() || !statsQ.data()) {
      <div class="flex min-h-[50vh] items-center justify-center text-danger">Failed to load dashboard statistics.</div>
    } @else {
      <div class="mx-auto max-w-[1200px] p-6">
        @if (failedEmails() > 0) {
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-[14px] text-red-800">
              <strong>{{ failedEmails() }} {{ failedEmails() === 1 ? 'email' : 'emails' }} failed to send.</strong>
              The people concerned have not been notified.
            </p>
            <a routerLink="/admin/emails" class="text-[13px] font-semibold text-red-800 underline hover:no-underline"
              >Open Email Log</a
            >
          </div>
        }

        <!-- Applications waiting for their President, oldest first -->
        @if (waiting().length > 0) {
          <div class="mb-5" appReportCard [heading]="'Waiting on President (' + waiting().length + ')'">
            @if (needsAttention() > 0) {
              <p class="-mt-1 mb-3 text-[13px] text-amber-800">
                {{ needsAttention() }} {{ needsAttention() === 1 ? 'application has' : 'applications have' }} been waiting 7
                days or more. Both automatic reminders have gone out; consider contacting the association.
              </p>
            }
            <ul class="divide-y divide-border">
              @for (app of waiting().slice(0, 8); track app.id) {
                <li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <div class="min-w-0">
                    <a
                      [routerLink]="'/admin/applications/' + app.id"
                      class="text-[14px] font-semibold text-navy hover:text-gold hover:underline"
                      >{{ app.firstName }} {{ app.lastName }}</a
                    >
                    <p class="text-[12px] text-text-light [overflow-wrap:anywhere]">
                      <span class="font-mono">{{ app.referenceNumber }}</span> · {{ app.associationName }} · President:
                      {{ app.presidentEmail }}
                    </p>
                  </div>
                  <span appWaitingFlag [submittedAt]="app.submittedAt"></span>
                </li>
              }
            </ul>
            @if (waiting().length > 8) {
              <a routerLink="/admin/applications" class="mt-2 inline-block text-[13px] font-semibold text-gold hover:underline"
                >See all {{ waiting().length }} in Applications →</a
              >
            }
          </div>
        }

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
  protected readonly waitingQ = injectQuery(() => ({
    queryKey: ['applications', 'waiting-on-president'],
    queryFn: () => adminApi.listApplications({ status: 'submitted', limit: 100 }),
    refetchInterval: 60000,
  }));
  protected readonly failedEmailsQ = injectQuery(() => ({
    queryKey: ['notifications', 'failed-count'],
    queryFn: () => adminApi.listNotifications({ failedOnly: true, page: 1, limit: 1 }),
    refetchInterval: 60000,
    // The email log is for roles that can act on it (view-only roles get a 403).
    enabled: canReview(currentRole()),
  }));
  protected readonly failedEmails = computed(() => (this.failedEmailsQ.data() as any)?.total ?? 0);
  /** Applications awaiting their President, longest wait first. */
  protected readonly waiting = computed(() =>
    [...((this.waitingQ.data() as any)?.data ?? [])].sort(
      (a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    ),
  );
  protected readonly needsAttention = computed(
    () => this.waiting().filter((a: any) => daysWaiting(a.submittedAt) >= WAITING_WARN_DAYS).length,
  );
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
