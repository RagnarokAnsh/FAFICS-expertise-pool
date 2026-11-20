import { COMMITTEE_OTHER } from '../constants/work';

// Read-only views of a submitted application, shared by the President's review
// page (components/endorse/endorsement-view.ts) and the admin application page
// (components/admin/application-profile.ts).

const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

// Drafts (and older submissions that skipped step validation) can contain
// partially-filled rows, e.g. a language row with a proficiency but no language
// name. Hide husks so a review never shows blank entries.
export const visibleEducations = (app: any): any[] =>
  (app?.educations ?? []).filter((e: any) => hasText(e?.degreeName) || hasText(e?.institution));

export const visibleLanguages = (app: any): any[] => (app?.languages ?? []).filter((l: any) => hasText(l?.language));

export const visibleUnExperiences = (app: any): any[] =>
  (app?.unExperiences ?? []).filter((e: any) => hasText(e?.agency) || hasText(e?.positionTitle));

export const visibleNonUnExperiences = (app: any): any[] =>
  (app?.nonUnExperiences ?? []).filter((e: any) => hasText(e?.organization) || hasText(e?.positionTitle));

export const visibleFaficsExperiences = (app: any): any[] =>
  (app?.faficsExperiences ?? []).filter((e: any) => hasText(e?.positionHeld));

export const visibleLocalExperiences = (app: any): any[] =>
  (app?.localExperiences ?? []).filter((e: any) => hasText(e?.positionHeld));

// Only areas the applicant actually rated, marked preferred, or added as a
// custom area. Unrated fixed areas are stored as a full matrix but carry no
// information on a read-only screen.
export const ratedExpertise = (app: any): any[] =>
  (app?.expertise ?? []).filter(
    (exp: any) => exp.expertiseLevel || exp.isPreferred || (exp.isCustom && exp.otherDescription),
  );

// Drop the "Other" sentinel; show the specified free text instead.
export function preferredCommittees(app: any): string[] {
  const committees = (app?.preferredCommittees ?? []).filter((c: string) => c !== COMMITTEE_OTHER);
  if (app?.preferredCommitteesOther) committees.push(app.preferredCommitteesOther);
  return committees;
}

// FAFICS "Area of Contribution" holds several committees joined with '; '.
// Drop the "Other" sentinel; show the specified free text instead.
export function contributionParts(exp: any): string[] {
  const parts = (exp?.areaOfContribution || '').split('; ').filter((c: string) => c && c !== COMMITTEE_OTHER);
  if (exp?.areaOfContributionOther) parts.push(exp.areaOfContributionOther);
  return parts;
}
