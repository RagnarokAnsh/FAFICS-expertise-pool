import React from 'react';
import { Card } from '../ui/Card';
import { EndorseActions } from './EndorseActions';
import { COMMITTEE_OTHER } from '../../lib/constants/work';
import { formatDate } from '../../lib/utils/date';

interface EndorsementViewProps {
  application: any;
  token?: string;
  isAdminView?: boolean;
}

const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

export function EndorsementView({ application, token, isAdminView }: EndorsementViewProps) {
  const renderField = (label: string, value: string | null | undefined) => (
    <div className="mb-4 min-w-0">
      <div className="text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1">{label}</div>
      {/* Long unbroken values (emails) must wrap, not clip at the card edge. */}
      <div className="text-[14px] text-navy font-medium break-words [overflow-wrap:anywhere]">{value || '-'}</div>
    </div>
  );

  // Drafts (and older submissions that skipped step validation) can contain
  // partially-filled rows — e.g. a language row with a proficiency but no
  // language name. Hide husks so the review never shows blank entries.
  const educations = (application.educations ?? []).filter(
    (e: any) => hasText(e?.degreeName) || hasText(e?.institution),
  );
  const languages = (application.languages ?? []).filter((l: any) => hasText(l?.language));
  const unExperiences = (application.unExperiences ?? []).filter(
    (e: any) => hasText(e?.agency) || hasText(e?.positionTitle),
  );
  const nonUnExperiences = (application.nonUnExperiences ?? []).filter(
    (e: any) => hasText(e?.organization) || hasText(e?.positionTitle),
  );
  const faficsExperiences = (application.faficsExperiences ?? []).filter((e: any) =>
    hasText(e?.positionHeld),
  );
  const localExperiences = (application.localExperiences ?? []).filter((e: any) =>
    hasText(e?.positionHeld),
  );

  return (
    <div className={isAdminView ? "" : "max-w-[1020px] mx-auto px-4 md:px-8 py-8"}>
      {!isAdminView && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-5 mb-8">
          <h2 className="text-[16px] font-serif font-bold text-navy mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reviewing Application
          </h2>
          <p className="text-[14px] text-text-mid">
            You are reviewing this application as <span className="font-semibold text-navy">{[application.firstName, application.middleName, application.lastName].filter(Boolean).join(' ')}</span>'s Association President. This is a read-only view. Please review the details carefully before endorsing or returning with comments.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 mb-8">
        <Card title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField("Reference Number", application.referenceNumber)}
            {renderField("Submitted At", application.submittedAt ? formatDate(application.submittedAt) : '-')}
            {renderField("Full Name", [application.firstName, application.middleName, application.lastName].filter(Boolean).join(' '))}
            {renderField("Email", application.email)}
            {renderField("Gender", application.gender)}
            {renderField("Phone", application.phone)}
            {renderField("Date of Birth", application.dateOfBirth ? formatDate(application.dateOfBirth) : '-')}
            {renderField("Separation Date", application.separationDate ? formatDate(application.separationDate) : '-')}
            {renderField("Nationality", application.nationality)}
            {renderField("Second Nationality", application.secondNationality)}
          </div>
        </Card>

        <Card title="Association Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField("Association Name", application.associationName)}
            {renderField("Association Country", application.associationCountry)}
            {renderField("General Email", application.associationGeneralEmail)}
            {renderField("President Email", application.presidentEmail)}
            {renderField("President Phone", application.presidentPhone)}
            {renderField("Associate Member Name", application.associateMemberName)}
            {renderField("Associate Member Country", application.associateMemberCountry)}
          </div>
        </Card>
      </div>

      <Card title="Education">
        {educations.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[420px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Degree Name</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Institution</th>
              </tr>
            </thead>
            <tbody>
              {educations.map((edu: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{edu.degreeName || '-'}</td>
                  <td className="py-3 text-[14px] text-text-mid">{edu.institution || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light">No education details provided.</p>
        )}
      </Card>

      <Card title="Languages">
        {languages.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[420px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Language</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Proficiency</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((lang: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{lang.language}</td>
                  <td className="py-3 text-[14px] text-text-mid capitalize">{lang.proficiency ? lang.proficiency.replace('_', ' ') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light">No language details provided.</p>
        )}
      </Card>

      <Card title="UN Experience">
        {unExperiences.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[520px] text-left border-collapse mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Agency</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Position Title</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Grade</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Area of Expertise</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
              </tr>
            </thead>
            <tbody>
              {unExperiences.map((exp: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{exp.agency}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.positionTitle}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.grade || '-'}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.areaOfExpertise || '-'}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.durationYears || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light mb-4">No UN experience provided.</p>
        )}
        {application.unExperienceSummary && (
          <div className="bg-gray-50 p-4 rounded text-sm text-text-mid italic">
            "{application.unExperienceSummary}"
          </div>
        )}
      </Card>

      <Card title="Non-UN Experience">
        {nonUnExperiences.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[520px] text-left border-collapse mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Organization</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Position Title</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Area of Expertise</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
              </tr>
            </thead>
            <tbody>
              {nonUnExperiences.map((exp: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{exp.organization}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.positionTitle}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.areaOfExpertise || '-'}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.durationYears || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light mb-4">No Non-UN experience provided.</p>
        )}
        {application.nonUnExperienceSummary && (
          <div className="bg-gray-50 p-4 rounded text-sm text-text-mid italic">
            "{application.nonUnExperienceSummary}"
          </div>
        )}
      </Card>

      <Card title="FAFICS Experience">
        {faficsExperiences.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[520px] text-left border-collapse mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Position Held</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Area of Contribution</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
              </tr>
            </thead>
            <tbody>
              {faficsExperiences.map((exp: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{exp.positionHeld}</td>
                  <td className="py-3 text-[14px] text-text-mid">
                    {(() => {
                      // Drop the "Other" sentinel; show the specified free text instead.
                      const parts = (exp.areaOfContribution || '')
                        .split('; ')
                        .filter((c: string) => c && c !== COMMITTEE_OTHER);
                      if (exp.areaOfContributionOther) parts.push(exp.areaOfContributionOther);
                      if (parts.length === 0) return '-';
                      return (
                        <ul className="flex flex-col gap-1">
                          {parts.map((c: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-navy-mid" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.durationYears || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light mb-4">No FAFICS experience provided.</p>
        )}
        {application.faficsExperienceSummary && (
          <div className="bg-gray-50 p-4 rounded text-sm text-text-mid italic">
            "{application.faficsExperienceSummary}"
          </div>
        )}
      </Card>

      <Card title="Local Association Experience">
        {localExperiences.length > 0 ? (
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[520px] text-left border-collapse mb-4">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Position Held</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Area of Contribution</th>
                <th className="py-2 text-[12px] font-semibold text-navy uppercase">Years</th>
              </tr>
            </thead>
            <tbody>
              {localExperiences.map((exp: any, idx: number) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-3 text-[14px] text-text-mid">{exp.positionHeld}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.areaOfContribution || '-'}</td>
                  <td className="py-3 text-[14px] text-text-mid">{exp.durationYears || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="text-sm text-text-light mb-4">No local association experience provided.</p>
        )}
        {application.localExperienceSummary && (
          <div className="bg-gray-50 p-4 rounded text-sm text-text-mid italic">
            "{application.localExperienceSummary}"
          </div>
        )}
      </Card>

      <Card title="Expertise Assessment">
        {(() => {
          // Only show areas the applicant actually rated, marked preferred, or
          // added as a custom area — unrated fixed areas are persisted as a full
          // matrix but carry no information on a read-only review screen.
          const rated = (application.expertise ?? []).filter(
            (exp: any) => exp.expertiseLevel || exp.isPreferred || (exp.isCustom && exp.otherDescription),
          );
          if (rated.length === 0) {
            return <p className="text-sm text-text-light">No expertise areas rated.</p>;
          }
          return (
            <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[360px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-[12px] font-semibold text-navy uppercase">Area</th>
                  <th className="py-2 text-[12px] font-semibold text-navy uppercase">Level</th>
                </tr>
              </thead>
              <tbody>
                {rated.map((exp: any, idx: number) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-3 text-[14px] text-text-mid">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {exp.areaLabel}
                        {exp.isPreferred && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
                            </svg>
                            Preferred
                          </span>
                        )}
                      </span>
                      {exp.isCustom && exp.otherDescription && (
                        <span className="block text-[12px] text-text-light mt-0.5">{exp.otherDescription}</span>
                      )}
                    </td>
                    <td className="py-3 text-[14px] text-text-mid capitalize">{exp.expertiseLevel || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          );
        })()}
      </Card>

      {application.competencies?.length > 0 && (
        <Card title="Core Competencies">
          <div className="flex flex-wrap gap-2">
            {application.competencies.map((c: string, idx: number) => (
              <span key={idx} className="inline-flex items-center rounded-full bg-gold-light px-3 py-1 text-[12.5px] font-medium text-gold">{c}</span>
            ))}
          </div>
        </Card>
      )}

      {(() => {
        // Drop the "Other" sentinel; show the specified free text instead.
        const committees = (application.preferredCommittees ?? []).filter((c: string) => c !== COMMITTEE_OTHER);
        if (application.preferredCommitteesOther) committees.push(application.preferredCommitteesOther);
        if (committees.length === 0 && !application.positionPreferenceRationale) return null;
        return (
          <Card title="Position / Committee Preference">
            {committees.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {committees.map((c: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center rounded-full bg-navy-light px-3 py-1 text-[12.5px] font-medium text-navy-mid">{c}</span>
                ))}
              </div>
            )}
            {application.positionPreferenceRationale && (
              <div className="bg-gray-50 p-4 rounded text-sm text-text-mid italic">
                "{application.positionPreferenceRationale}"
              </div>
            )}
          </Card>
        );
      })()}

      {!isAdminView && token && (
        <div className="mt-12">
          <EndorseActions token={token} />
        </div>
      )}
    </div>
  );
}
