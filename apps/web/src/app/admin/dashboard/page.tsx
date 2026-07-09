'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { ReportCard, StatusBadge } from '@/components/admin/ui';
import { ExpertiseBarChart } from '@/components/admin/charts/ExpertiseBarChart';
import { DistributionPieChart } from '@/components/admin/charts/DistributionPieChart';
import { formatDate } from '@/lib/utils/date';

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

  const statusData = [
    { label: 'draft', count: stats.drafts ?? 0 },
    { label: 'submitted', count: stats.pendingEndorsement ?? 0 },
    { label: 'endorsed', count: stats.pendingReview ?? 0 },
    { label: 'under_review', count: stats.underReview ?? 0 },
    { label: 'changes_requested', count: stats.changesRequested ?? 0 },
    { label: 'approved', count: stats.activeInPool ?? 0 },
    { label: 'rejected', count: stats.rejected ?? 0 },
    { label: 'expired', count: stats.expired ?? 0 },
  ].filter((d) => d.count > 0);

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      {/* Distribution pie charts */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ReportCard title="Application Status">
          <DistributionPieChart data={statusData} labelMap={STATUS_LABELS} />
        </ReportCard>
        <ReportCard title="Nationalities">
          {analyticsQ.isLoading ? (
            <div className="h-64 animate-pulse rounded bg-off-white" />
          ) : (
            <DistributionPieChart data={analytics?.nationalityBreakdown ?? []} />
          )}
        </ReportCard>
        <ReportCard title="Gender">
          {analyticsQ.isLoading ? (
            <div className="h-64 animate-pulse rounded bg-off-white" />
          ) : (
            <DistributionPieChart data={analytics?.genderBalance ?? []} labelMap={GENDER_LABELS} />
          )}
        </ReportCard>
      </div>

      {/* Expertise areas */}
      <div className="mb-5">
        <ReportCard title="Expertise Areas — Experts per Category">
          {analyticsQ.isLoading ? (
            <div className="h-64 animate-pulse rounded bg-off-white" />
          ) : (
            <ExpertiseBarChart data={analytics?.expertiseDistribution ?? []} />
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
                  {formatDate(app.approvedAt ?? app.submittedAt ?? null)}
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
