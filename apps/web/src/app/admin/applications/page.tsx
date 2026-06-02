'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { ApplicationTable } from '@/components/admin/ApplicationTable';

export default function AdminApplicationsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, country]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', { page, limit, search: debouncedSearch, status, country }],
    queryFn: () => adminApi.listApplications({ page, limit, search: debouncedSearch, status, country }),
  });

  // Fetch distinct countries for the filter dropdown
  const { data: countries } = useQuery({
    queryKey: ['distinct-countries'],
    queryFn: () => adminApi.getDistinctCountries(),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCountry('');
    setPage(1);
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-text-mid">Manage and review submissions to the Expertise Pool.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-border flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">Search Name / Ref</label>
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>
        <div className="w-[180px]">
          <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">Status</label>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy bg-white"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted (Pending President)</option>
            <option value="endorsed">Endorsed (Pending Review)</option>
            <option value="under_review">Under Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved (Active in Pool)</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="w-[180px]">
          <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">Country</label>
          <select 
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-border rounded h-[38px] px-3 text-[13px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy bg-white"
          >
            <option value="">All Countries</option>
            {(countries || []).map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={clearFilters}
          className="h-[38px] px-4 rounded border border-border bg-gray-50 text-[13px] font-medium text-text-mid hover:bg-gray-100 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 text-red-600 p-4 rounded mt-4 border border-red-100">
          Failed to load applications. Please try again later.
        </div>
      )}

      <ApplicationTable 
        data={data?.data || []} 
        isLoading={isLoading} 
        page={page} 
        total={data?.total || 0} 
        limit={limit}
        onPageChange={setPage}
      />
    </div>
  );
}
