'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';

function initials(first: string, last: string) {
  return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();
}

function dur(years: number | null) {
  if (years == null) return '';
  if (years >= 99) return ' · 30+ yrs';
  return ` · ${years} yr${years === 1 ? '' : 's'}`;
}

const LEVEL_PILL: Record<string, string> = {
  expert: 'bg-[#eeedfe] text-[#534ab7]',
  advanced: 'bg-navy-light text-navy-mid',
  average: 'bg-off-white text-text-muted border border-border',
};

function Block({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-off-white p-4 ${className}`}>
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (!v) return null;
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="w-[78px] shrink-0 text-[11px] text-text-muted">{k}</span>
      <span className="text-[12.5px] font-medium leading-snug text-text">{v}</span>
    </div>
  );
}

export function ProfileModal({ applicationId, onClose }: { applicationId: string | null; onClose: () => void }) {
  const { data: app, isLoading } = useQuery({
    queryKey: ['application-detail', applicationId],
    queryFn: () => adminApi.getApplication(applicationId as string),
    enabled: !!applicationId,
  });

  if (!applicationId) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/60 p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {isLoading || !app ? (
          <div className="flex h-64 items-center justify-center text-text-muted">Loading profile…</div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-3.5 bg-navy px-6 py-5">
              <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[3px] border-gold/30 bg-gold font-serif text-[17px] font-bold text-white">
                {initials(app.firstName, app.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-[19px] font-bold text-white">{app.firstName} {app.lastName}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-white/50">
                  {[app.nationality, app.associationName, app.referenceNumber].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[18px] text-white transition-colors hover:bg-white/20">×</button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Block title="Personal Details">
                  <Row k="Gender" v={app.gender} />
                  <Row k="Nationality" v={[app.nationality, app.secondNationality].filter(Boolean).join(', ')} />
                  <Row k="Email" v={app.email} />
                  <Row k="Phone" v={app.phone} />
                  <Row k="Separated" v={app.separationDate} />
                  <Row k="Association" v={`${app.associationName}, ${app.associationCountry}`} />
                </Block>
                <Block title="Languages">
                  <ul>
                    {app.languages?.map((l: any) => (
                      <li key={l.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {l.language} <span className="text-text-muted">({String(l.proficiency).replace('_', ' ')})</span>
                      </li>
                    ))}
                  </ul>
                  {app.educations?.length > 0 && (
                    <>
                      <div className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-navy-mid">Education</div>
                      <ul>
                        {app.educations.map((e: any) => (
                          <li key={e.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                            {e.degreeName} — {e.institution}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Block>
              </div>

              {app.unExperiences?.length > 0 && (
                <Block title="UN Experience" className="mb-4">
                  <ul>
                    {app.unExperiences.map((e: any) => (
                      <li key={e.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {e.agency} — {e.positionTitle}{e.grade ? `, ${e.grade}` : ''}{dur(e.durationYears)}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              <Block title="Self-Assessment">
                <div className="flex flex-col gap-1.5">
                  {app.expertise?.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className="flex-1 text-[12px] text-text">{e.areaLabel}</span>
                      {e.expertiseLevel && (
                        <span className={`rounded-[10px] px-2 py-0.5 text-[10px] font-semibold capitalize ${LEVEL_PILL[e.expertiseLevel] ?? LEVEL_PILL.average}`}>
                          {e.expertiseLevel}
                        </span>
                      )}
                      {e.isPreferred && <span className="text-[13px] text-gold" title="Preferred area">★</span>}
                    </div>
                  ))}
                </div>
              </Block>

              {app.status === 'approved' && (
                <div className="mt-3 rounded-lg border border-[#c0dd97] bg-[#eaf3de] px-3.5 py-2.5 text-[12px] text-success">
                  <strong>✓ Active in Expertise Pool</strong>
                  {app.approvedAt && ` — Approved ${new Date(app.approvedAt).toLocaleDateString('en-GB')}`}
                  {app.expiresAt && ` · Expires ${new Date(app.expiresAt).toLocaleDateString('en-GB')}`}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
