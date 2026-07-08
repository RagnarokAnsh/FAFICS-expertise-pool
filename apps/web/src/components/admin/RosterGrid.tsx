'use client';

import React from 'react';
import { StatusBadge } from './ui';
import { formatDate } from '@/lib/utils/date';

interface ApplicationSummary {
  id: string;
  referenceNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  associationName: string;
  associationCountry: string;
  status: string;
  preferredAreas: string[];
  expiresAt: string | null;
  nationality?: string;
}

interface Props {
  applications: ApplicationSummary[];
  onSelect: (id: string) => void;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return null;
  return `Expires ${formatDate(expiresAt)}`;
}

export function RosterGrid({ applications, onSelect }: Props) {
  if (!applications.length) {
    return (
      <div className="py-14 text-center text-text-muted">
        <svg className="mx-auto mb-3 h-11 w-11 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <h4 className="mb-1 text-[14px] text-text-mid">No profiles found</h4>
        <p className="text-[12.5px]">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {applications.map((app) => (
        <button
          key={app.id}
          onClick={() => onSelect(app.id)}
          className="group flex h-full flex-col overflow-hidden rounded-theme border border-border bg-white text-left shadow-theme transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
        >
          <div className="flex w-full items-center gap-3 bg-navy px-4 py-3">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-gold font-serif text-[14px] font-bold text-white">
              {getInitials(app.firstName, app.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-white">{app.firstName} {app.lastName}</div>
              <div className="truncate text-[11px] text-white/50">
                {[app.nationality, app.associationName].filter(Boolean).join(' · ')}
              </div>
            </div>
            {app.referenceNumber && <div className="shrink-0 text-[10px] text-white/30">{app.referenceNumber}</div>}
          </div>

          <div className="flex-1 w-full px-4 py-3">
            {app.preferredAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {app.preferredAreas.slice(0, 3).map((area) => (
                  <span key={area} className="rounded-[10px] border border-gold bg-gold-light px-2 py-[3px] text-[10px] font-semibold text-[#7a5010]">
                    {area}
                  </span>
                ))}
                {app.preferredAreas.length > 3 && (
                  <span className="px-1 py-[3px] text-[10px] text-text-muted">+{app.preferredAreas.length - 3}</span>
                )}
              </div>
            ) : (
              <div className="text-[11.5px] text-text-muted">No preferred areas listed</div>
            )}
          </div>

          <div className="mt-auto flex w-full items-center justify-between border-t border-border px-4 py-2.5">
            <StatusBadge status={app.status} />
            <span className="text-[10.5px] text-text-muted">{expiryLabel(app.expiresAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
