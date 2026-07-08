'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { COMMITTEE_OTHER } from '@/lib/constants/work';
import { formatDate } from '@/lib/utils/date';

function initials(first: string, last: string) {
  return `${first?.charAt(0) ?? ''}${last?.charAt(0) ?? ''}`.toUpperCase();
}

function dur(years: number | string | null) {
  if (years == null || years === '') return '';
  const n = Number(years);
  if (!Number.isFinite(n)) return '';
  if (n >= 99) return ' · 30+ yrs';
  return ` · ${n} yr${n === 1 ? '' : 's'}`;
}

/** FAFICS "Area of Contribution": drop the "Other" sentinel, append its free text. */
function faficsArea(e: any): string {
  const parts = (e.areaOfContribution || '')
    .split('; ')
    .filter((c: string) => c && c !== COMMITTEE_OTHER);
  if (e.areaOfContributionOther) parts.push(e.areaOfContributionOther);
  return parts.join(', ');
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
                  <Row k="Separated" v={app.separationDate && formatDate(app.separationDate)} />
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
                  {app.unExperienceSummary && (
                    <p className="mt-2 text-[12px] italic leading-snug text-text-muted">{app.unExperienceSummary}</p>
                  )}
                </Block>
              )}

              {app.nonUnExperiences?.length > 0 && (
                <Block title="Non-UN Experience" className="mb-4">
                  <ul>
                    {app.nonUnExperiences.map((e: any) => (
                      <li key={e.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {e.organization} — {e.positionTitle}{e.areaOfExpertise ? `, ${e.areaOfExpertise}` : ''}{dur(e.durationYears)}
                      </li>
                    ))}
                  </ul>
                  {app.nonUnExperienceSummary && (
                    <p className="mt-2 text-[12px] italic leading-snug text-text-muted">{app.nonUnExperienceSummary}</p>
                  )}
                </Block>
              )}

              {app.faficsExperiences?.length > 0 && (
                <Block title="FAFICS Experience" className="mb-4">
                  <ul>
                    {app.faficsExperiences.map((e: any) => {
                      const area = faficsArea(e);
                      return (
                        <li key={e.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                          {e.positionHeld}{area ? ` — ${area}` : ''}{dur(e.durationYears)}
                        </li>
                      );
                    })}
                  </ul>
                  {app.faficsExperienceSummary && (
                    <p className="mt-2 text-[12px] italic leading-snug text-text-muted">{app.faficsExperienceSummary}</p>
                  )}
                </Block>
              )}

              {app.localExperiences?.length > 0 && (
                <Block title="Local Association Experience" className="mb-4">
                  <ul>
                    {app.localExperiences.map((e: any) => (
                      <li key={e.id} className="border-b border-border py-1.5 text-[12.5px] text-text last:border-none">
                        {e.positionHeld}{e.areaOfContribution ? ` — ${e.areaOfContribution}` : ''}{dur(e.durationYears)}
                      </li>
                    ))}
                  </ul>
                  {app.localExperienceSummary && (
                    <p className="mt-2 text-[12px] italic leading-snug text-text-muted">{app.localExperienceSummary}</p>
                  )}
                </Block>
              )}

              <Block title="Self-Assessment">
                <div className="flex flex-col gap-1.5">
                  {app.expertise
                    ?.filter((e: any) => e.expertiseLevel || e.isPreferred || (e.isCustom && e.otherDescription))
                    .map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span
                        className={`w-4 shrink-0 text-center text-[13px] text-gold ${e.isPreferred ? '' : 'invisible'}`}
                        title={e.isPreferred ? 'Preferred area' : undefined}
                        aria-hidden={!e.isPreferred}
                      >
                        ★
                      </span>
                      <span className="flex-1 text-[12px] text-text">{e.areaLabel}</span>
                      {e.expertiseLevel && (
                        <span className={`rounded-[10px] px-2 py-0.5 text-[10px] font-semibold capitalize ${LEVEL_PILL[e.expertiseLevel] ?? LEVEL_PILL.average}`}>
                          {e.expertiseLevel}
                        </span>
                      )}
                    </div>
                  ))}
                  {!app.expertise?.some((e: any) => e.expertiseLevel || e.isPreferred || (e.isCustom && e.otherDescription)) && (
                    <span className="text-[12px] text-text-muted">No expertise areas rated.</span>
                  )}
                </div>
              </Block>

              {app.competencies?.length > 0 && (
                <Block title="Core Competencies" className="mt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {app.competencies.map((c: string) => (
                      <span key={c} className="rounded-[10px] bg-gold-light px-2 py-0.5 text-[11px] font-medium text-gold">{c}</span>
                    ))}
                  </div>
                </Block>
              )}

              {(() => {
                // Drop the "Other" sentinel and show the specified free text instead.
                const committees = (app.preferredCommittees ?? []).filter((c: string) => c !== COMMITTEE_OTHER);
                if (app.preferredCommitteesOther) committees.push(app.preferredCommitteesOther);
                if (committees.length === 0 && !app.positionPreferenceRationale) return null;
                return (
                  <Block title="Position / Committee Preference" className="mt-4">
                    {committees.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {committees.map((c: string) => (
                          <span key={c} className="rounded-[10px] bg-navy-light px-2 py-0.5 text-[11px] font-medium text-navy-mid">{c}</span>
                        ))}
                      </div>
                    )}
                    {app.positionPreferenceRationale && (
                      <p className="text-[12.5px] leading-snug text-text">{app.positionPreferenceRationale}</p>
                    )}
                  </Block>
                );
              })()}

              {app.status === 'approved' && (
                <div className="mt-3 rounded-lg border border-[#c0dd97] bg-[#eaf3de] px-3.5 py-2.5 text-[12px] text-success">
                  <strong>✓ Active in Expertise Pool</strong>
                  {app.approvedAt && ` — Approved ${formatDate(app.approvedAt)}`}
                  {app.expiresAt && ` · Expires ${formatDate(app.expiresAt)}`}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
