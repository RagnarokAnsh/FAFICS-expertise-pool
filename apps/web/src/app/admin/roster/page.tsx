'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { RosterGrid } from '@/components/admin/RosterGrid';
import { ProfileModal } from '@/components/admin/ProfileModal';
import { SectionHeader } from '@/components/admin/ui';
import { FIXED_EXPERTISE_AREAS } from '@/lib/constants/expertise';

export default function RosterPage() {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
          (a.nationality ?? '').toLowerCase().includes(q) ||
          (a.referenceNumber ?? '').toLowerCase().includes(q),
      );
    }
    if (areaFilter) {
      list = list.filter((a: any) =>
        a.preferredAreas?.some((area: string) => area.toLowerCase().includes(areaFilter.toLowerCase())),
      );
    }
    return list;
  }, [applications, search, areaFilter]);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <SectionHeader
        subtitle={isLoading ? 'Loading…' : `Showing ${filtered.length} active profile${filtered.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => adminApi.exportRoster()}
            className="rounded-md bg-navy px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-mid"
          >
            ↓ Export CSV
          </button>
        }
      />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-theme border border-border bg-white px-4 py-3.5">
        <div className="relative min-w-[200px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, nationality, association…"
            className="h-[38px] w-full rounded-md border border-border bg-off-white pl-9 pr-3 text-[13px] text-text outline-none transition-colors focus:border-navy-mid focus:bg-white"
          />
        </div>
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="h-[38px] cursor-pointer rounded-md border border-border bg-off-white px-3 text-[12.5px] text-text outline-none focus:border-navy-mid"
        >
          <option value="">All Expertise Areas</option>
          {FIXED_EXPERTISE_AREAS.map((a) => (
            <option key={a.key} value={a.label}>{a.label}</option>
          ))}
        </select>
        {(search || areaFilter) && (
          <button
            onClick={() => { setSearch(''); setAreaFilter(''); }}
            className="text-[12.5px] text-text-muted underline underline-offset-2 hover:text-navy"
          >
            Clear filters
          </button>
        )}
      </div>

      {isError && <p className="mb-4 text-sm text-danger">Failed to load Expertise Pool.</p>}

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-theme border border-border bg-white">
              <div className="flex items-center gap-3 bg-navy px-4 py-3">
                <div className="h-[38px] w-[38px] animate-pulse rounded-full bg-white/20" />
                <div className="flex-1">
                  <div className="mb-2 h-3 w-28 animate-pulse rounded bg-white/20" />
                  <div className="h-2 w-16 animate-pulse rounded bg-white/10" />
                </div>
              </div>
              <div className="h-16 animate-pulse bg-off-white" />
            </div>
          ))}
        </div>
      ) : (
        <RosterGrid applications={filtered} onSelect={setSelectedId} />
      )}

      <ProfileModal applicationId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
