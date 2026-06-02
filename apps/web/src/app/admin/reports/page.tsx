'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { ReportCard, SectionHeader } from '@/components/admin/ui';
import { ExpertiseBarChart } from '@/components/admin/charts/ExpertiseBarChart';
import { NationalityBarChart } from '@/components/admin/charts/NationalityBarChart';
import { GenderDonutChart } from '@/components/admin/charts/GenderDonutChart';
import { LanguageBarChart } from '@/components/admin/charts/LanguageBarChart';
import { GradeBarChart } from '@/components/admin/charts/GradeBarChart';

function SkeletonCard() {
  return (
    <div className="rounded-theme border border-border bg-white p-5 shadow-theme">
      <div className="mb-4 h-3 w-40 animate-pulse rounded bg-off-white" />
      <div className="h-64 animate-pulse rounded bg-off-white" />
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['analytics'], queryFn: adminApi.getAnalytics });

  if (isError) {
    return <div className="p-6"><p className="text-sm text-danger">Failed to load analytics data.</p></div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <SectionHeader
        subtitle="Insights across all approved profiles active in the Expertise Pool."
        action={
          <button
            onClick={() => adminApi.exportRoster()}
            className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid"
          >
            ↓ Export CSV
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <ReportCard title="Expertise Distribution (Preferred Areas)">
              <ExpertiseBarChart data={data?.expertiseDistribution ?? []} />
            </ReportCard>
          </div>
          <ReportCard title="Nationality Breakdown (Top 15)">
            <NationalityBarChart data={data?.nationalityBreakdown ?? []} />
          </ReportCard>
          <ReportCard title="Gender Balance">
            <GenderDonutChart data={data?.genderBalance ?? []} />
          </ReportCard>
          <ReportCard title="Language Coverage">
            <LanguageBarChart data={data?.languageCoverage ?? []} />
          </ReportCard>
          <ReportCard title="UN Grade Distribution">
            <GradeBarChart data={data?.gradeDistribution ?? []} />
          </ReportCard>
        </div>
      )}
    </div>
  );
}
