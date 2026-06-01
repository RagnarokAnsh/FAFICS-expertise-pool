'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { ExpertiseBarChart } from '@/components/admin/charts/ExpertiseBarChart';
import { NationalityBarChart } from '@/components/admin/charts/NationalityBarChart';
import { GenderDonutChart } from '@/components/admin/charts/GenderDonutChart';
import { LanguageBarChart } from '@/components/admin/charts/LanguageBarChart';
import { GradeBarChart } from '@/components/admin/charts/GradeBarChart';

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6">
      <h3 className="font-serif font-bold text-navy text-[16px] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6">
      <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="h-64 bg-gray-50 rounded animate-pulse" />
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics'],
    queryFn: adminApi.getAnalytics,
  });

  if (isError) {
    return (
      <div className="p-8">
        <p className="text-red-600 text-sm">Failed to load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-[28px] font-bold text-navy mb-2">Reports & Analytics</h1>
        <p className="text-text-mid">Breakdown of approved profiles currently active in the Expertise Pool.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-2">
            <ChartCard title="Expertise Distribution">
              <ExpertiseBarChart data={data?.expertiseDistribution ?? []} />
            </ChartCard>
          </div>

          <ChartCard title="Nationality Breakdown (Top 15)">
            <NationalityBarChart data={data?.nationalityBreakdown ?? []} />
          </ChartCard>

          <ChartCard title="Gender Balance">
            <GenderDonutChart data={data?.genderBalance ?? []} />
          </ChartCard>

          <ChartCard title="Language Coverage">
            <LanguageBarChart data={data?.languageCoverage ?? []} />
          </ChartCard>

          <ChartCard title="UN Grade Distribution">
            <GradeBarChart data={data?.gradeDistribution ?? []} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
