'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { RosterGrid } from '@/components/admin/RosterGrid';

const EXPERTISE_AREAS = [
  'Administration and Management',
  'Budget and Finance',
  'Conference Services',
  'Human Resources',
  'Information and Communication Technology',
  'Internal Oversight',
  'Legal',
  'Logistics and Supply Chain',
  'Political Affairs and Peacebuilding',
  'Programme Management',
  'Public Information and Communication',
];

export default function RosterPage() {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['roster'],
    queryFn: () => adminApi.listApplications({ status: 'approved', limit: 500 }),
  });

  const applications = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = applications;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a: any) =>
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
          (a.associationName ?? '').toLowerCase().includes(q) ||
          (a.associationCountry ?? '').toLowerCase().includes(q) ||
          (a.referenceNumber ?? '').toLowerCase().includes(q),
      );
    }
    if (areaFilter) {
      list = list.filter((a: any) =>
        a.preferredAreas?.some((area: string) =>
          area.toLowerCase().includes(areaFilter.toLowerCase()),
        ),
      );
    }
    return list;
  }, [applications, search, areaFilter]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-bold text-navy mb-2">Expertise Pool Roster</h1>
          <p className="text-text-mid">
            {isLoading ? 'Loading...' : `${filtered.length} active profile${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-border flex flex-wrap gap-4 items-end mb-6">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, association, ref..."
            className="w-full border border-border rounded px-3 py-2 text-[13px] text-navy placeholder:text-text-light focus:outline-none focus:ring-1 focus:ring-navy/30"
          />
        </div>

        <div className="min-w-[220px]">
          <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">
            Expertise Area
          </label>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-[13px] text-navy focus:outline-none focus:ring-1 focus:ring-navy/30 bg-white"
          >
            <option value="">All areas</option>
            {EXPERTISE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {(search || areaFilter) && (
          <button
            onClick={() => { setSearch(''); setAreaFilter(''); }}
            className="text-[13px] text-text-mid hover:text-navy underline underline-offset-2 pb-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {isError && (
        <p className="text-red-600 text-sm mb-4">Failed to load roster.</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-28 bg-gray-100 rounded animate-pulse mb-2" />
                  <div className="h-2 w-16 bg-gray-50 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-2 w-40 bg-gray-50 rounded animate-pulse mb-2" />
              <div className="h-2 w-24 bg-gray-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <RosterGrid applications={filtered} />
      )}
    </div>
  );
}
