'use client';

import React from 'react';

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
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days <= 30) return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expires in {days}d</span>;
  if (days <= 90) return <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Expires in {days}d</span>;
  return null;
}

export function RosterGrid({ applications }: Props) {
  if (!applications.length) {
    return (
      <div className="text-center py-16 text-text-light">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">No profiles found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {applications.map((app) => (
        <div key={app.id} className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-navy border-2 border-gold flex items-center justify-center shrink-0">
              <span className="text-gold text-[13px] font-bold">{getInitials(app.firstName, app.lastName)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-navy text-[14px] truncate">
                {app.firstName} {app.lastName}
              </div>
              {app.referenceNumber && (
                <div className="text-[11px] text-text-light font-mono">{app.referenceNumber}</div>
              )}
            </div>
            <ExpiryBadge expiresAt={app.expiresAt} />
          </div>

          <div className="text-[12px] text-text-mid mb-1 truncate">{app.associationName}</div>
          <div className="text-[12px] text-text-light mb-3">{app.associationCountry}</div>

          {app.preferredAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.preferredAreas.slice(0, 3).map((area) => (
                <span key={area} className="text-[10px] bg-gold/10 text-[#8a6520] px-2 py-0.5 rounded-full font-medium">
                  {area}
                </span>
              ))}
              {app.preferredAreas.length > 3 && (
                <span className="text-[10px] text-text-light px-2 py-0.5">
                  +{app.preferredAreas.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
