'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { StatCard } from '@/components/admin/StatCard';

export default function AdminDashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 60000, // Poll every 60 seconds
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-text-light font-medium tracking-wide">Loading dashboard data...</div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-red-500 font-medium">Failed to load dashboard statistics.</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-[28px] font-bold text-navy mb-2">Dashboard</h1>
        <p className="text-text-mid">Overview of the FAFICS Expertise Pool application statuses.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Pending Endorsement" 
          value={stats.pendingEndorsement} 
          color="border-l-blue-500" 
          href="/admin/applications?status=submitted"
        />
        <StatCard 
          label="Pending Review" 
          value={stats.pendingReview} 
          color="border-l-purple-500" 
          href="/admin/applications?status=endorsed"
        />
        <StatCard 
          label="Under Review" 
          value={stats.underReview} 
          color="border-l-indigo-500" 
          href="/admin/applications?status=under_review"
        />
        <StatCard 
          label="Active in Pool" 
          value={stats.activeInPool} 
          color="border-l-green-500" 
          href="/admin/applications?status=approved"
        />
        <StatCard 
          label="Changes Requested" 
          value={stats.changesRequested} 
          color="border-l-amber-500" 
          href="/admin/applications?status=changes_requested"
        />
        <StatCard 
          label="Expiring in 90 Days" 
          value={stats.expiring90Days} 
          color="border-l-orange-500" 
          href="/admin/expiring"
        />
        <StatCard 
          label="Rejected" 
          value={stats.rejected} 
          color="border-l-red-500" 
          href="/admin/applications?status=rejected"
        />
        <StatCard 
          label="Expired" 
          value={stats.expired} 
          color="border-l-gray-500" 
          href="/admin/applications?status=expired"
        />
      </div>
    </div>
  );
}
