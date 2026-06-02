'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { StatCard } from '@/components/admin/StatCard';
import { ReportCard, StatusBadge, ICONS } from '@/components/admin/ui';
import { ExpertiseBarChart } from '@/components/admin/charts/ExpertiseBarChart';
import { LanguageBarChart } from '@/components/admin/charts/LanguageBarChart';

function initials(first: string, last: string) {
  return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

export default function AdminDashboard() {
  const statsQ = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats, refetchInterval: 60000 });
  const analyticsQ = useQuery({ queryKey: ['analytics'], queryFn: adminApi.getAnalytics });
  const recentQ = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => adminApi.listApplications({ limit: 7 }),
  });

  const stats = statsQ.data;
  const analytics = analyticsQ.data;
  const recent = recentQ.data?.data ?? [];

  if (statsQ.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-text-muted">Loading dashboard…</div>;
  }
  if (statsQ.isError || !stats) {
    return <div className="flex min-h-[50vh] items-center justify-center text-danger">Failed to load dashboard statistics.</div>;
  }

  const nationalities = analytics?.nationalityBreakdown?.length ?? 0;
  const areasCovered = analytics?.expertiseDistribution?.length ?? 0;

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      {/* Headline stats */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard accent="success" label="Active in Pool" value={stats.activeInPool} sub="Endorsed & approved" icon={ICONS.users} href="/admin/roster" />
        <StatCard accent="pending" label="Pending Endorsement" value={stats.pendingEndorsement} sub="Awaiting President review" icon={ICONS.clock} href="/admin/applications?status=submitted" />
        <StatCard accent="gold" label="Nationalities" value={nationalities} sub="Geographic diversity" icon={ICONS.globe} href="/admin/reports" />
        <StatCard accent="navy" label="Expertise Areas Covered" value={`${areasCovered}/11`} sub="Across the active pool" icon={ICONS.grid} href="/admin/reports" />
      </div>

      {/* Workflow statuses */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard accent="navy" label="Pending Review" value={stats.pendingReview} sub="Endorsed, awaiting desk review" href="/admin/applications?status=endorsed" />
        <StatCard accent="navy" label="Under Review" value={stats.underReview} sub="Actively being reviewed" href="/admin/applications?status=under_review" />
        <StatCard accent="pending" label="Changes Requested" value={stats.changesRequested} sub="Returned to applicant" href="/admin/applications?status=changes_requested" />
        <StatCard accent="gold" label="Expiring in 90 Days" value={stats.expiring90Days} sub="Renewal reminders due" href="/admin/expiring" />
      </div>

      {/* Charts */}
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportCard title="Top Preferred Expertise Areas">
          {analyticsQ.isLoading ? (
            <div className="h-64 animate-pulse rounded bg-off-white" />
          ) : (
            <ExpertiseBarChart data={(analytics?.expertiseDistribution ?? []).slice(0, 6)} />
          )}
        </ReportCard>
        <ReportCard title="Language Coverage">
          {analyticsQ.isLoading ? (
            <div className="h-64 animate-pulse rounded bg-off-white" />
          ) : (
            <LanguageBarChart data={(analytics?.languageCoverage ?? []).slice(0, 8)} />
          )}
        </ReportCard>
      </div>

      {/* Recent activity */}
      <ReportCard title="Recent Activity">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-text-muted">No recent activity.</p>
        ) : (
          <div>
            {recent.map((app: any) => (
              <div key={app.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-none">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11.5px] font-bold text-white">
                  {initials(app.firstName, app.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{app.firstName} {app.lastName}</div>
                  <div className="truncate text-[11.5px] text-text-muted">{activityLine(app)}</div>
                </div>
                <div className="hidden text-[11px] text-text-muted sm:block">
                  {fmtDate(app.approvedAt ?? app.submittedAt ?? null)}
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        )}
      </ReportCard>
    </div>
  );
}
