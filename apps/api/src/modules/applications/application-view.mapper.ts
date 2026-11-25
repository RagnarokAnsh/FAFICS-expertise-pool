import { ApplicantApplicationView, EndorsementView } from '@fafics/shared';

/**
 * Read-only views of a submitted application, shared by the President's
 * endorsement page and the applicant's own view-only page, so both always show
 * the same fields. Internal fields (notes, UID, audit data) are left out.
 */
export const APPLICATION_VIEW_INCLUDE = {
  educations: { orderBy: { sortOrder: 'asc' } },
  languages: { orderBy: { sortOrder: 'asc' } },
  unExperiences: { orderBy: { sortOrder: 'asc' } },
  nonUnExperiences: { orderBy: { sortOrder: 'asc' } },
  faficsExperiences: { orderBy: { sortOrder: 'asc' } },
  localExperiences: { orderBy: { sortOrder: 'asc' } },
  expertise: { orderBy: { sortOrder: 'asc' } },
} as const;

/** An application row with APPLICATION_VIEW_INCLUDE attached (the data layer returns untyped rows). */
export type ApplicationWithViewRelations = any;

export function toEndorsementView(application: ApplicationWithViewRelations): EndorsementView {
  return {
    referenceNumber: application.referenceNumber!,
    applicantFullName: `${application.firstName} ${application.lastName}`,
    firstName: application.firstName,
    middleName: application.middleName,
    lastName: application.lastName,
    email: application.email,
    nationality: application.nationality,
    secondNationality: application.secondNationality,
    gender: application.gender,
    phone: application.phone,
    dateOfBirth: application.dateOfBirth ? application.dateOfBirth.toISOString().split('T')[0] : '',
    separationDate: application.separationDate ? application.separationDate.toISOString().split('T')[0] : '',
    associationName: application.associationName,
    associationCountry: application.associationCountry,
    associationGeneralEmail: application.associationGeneralEmail,
    presidentEmail: application.presidentEmail,
    presidentPhone: application.presidentPhone,
    associateMemberName: application.associateMemberName,
    associateMemberCountry: application.associateMemberCountry,
    educations: application.educations.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      degreeName: e.degreeName,
      institution: e.institution,
    })),
    languages: application.languages.map(l => ({
      id: l.id,
      sortOrder: l.sortOrder,
      language: l.language,
      proficiency: l.proficiency as any,
    })),
    unExperiences: application.unExperiences.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      agency: e.agency,
      positionTitle: e.positionTitle,
      grade: e.grade,
      areaOfExpertise: e.areaOfExpertise,
      durationYears: e.durationYears ? Number(e.durationYears) : null,
    })),
    nonUnExperiences: application.nonUnExperiences.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      organization: e.organization,
      positionTitle: e.positionTitle,
      areaOfExpertise: e.areaOfExpertise,
      durationYears: e.durationYears ? Number(e.durationYears) : null,
    })),
    faficsExperiences: application.faficsExperiences.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      positionHeld: e.positionHeld,
      areaOfContribution: e.areaOfContribution,
      areaOfContributionOther: e.areaOfContributionOther,
      durationYears: e.durationYears ? Number(e.durationYears) : null,
    })),
    localExperiences: application.localExperiences.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      positionHeld: e.positionHeld,
      areaOfContribution: e.areaOfContribution,
      durationYears: e.durationYears ? Number(e.durationYears) : null,
    })),
    expertise: application.expertise.map(e => ({
      id: e.id,
      sortOrder: e.sortOrder,
      customIndex: e.customIndex,
      areaKey: e.areaKey,
      areaLabel: e.areaLabel,
      expertiseLevel: e.expertiseLevel as any,
      isPreferred: e.isPreferred,
      isCustom: e.isCustom,
      otherDescription: e.otherDescription,
    })),
    unExperienceSummary: application.unExperienceSummary,
    nonUnExperienceSummary: application.nonUnExperienceSummary,
    faficsExperienceSummary: application.faficsExperienceSummary,
    localExperienceSummary: application.localExperienceSummary,
    preferredCommittees: application.preferredCommittees,
    preferredCommitteesOther: application.preferredCommitteesOther,
    positionPreferenceRationale: application.positionPreferenceRationale,
    competencies: application.competencies,
    submittedAt: application.submittedAt ? application.submittedAt.toISOString() : null,
  };
}

/** The applicant's view: everything the President sees, plus where it stands. */
export function toApplicantApplicationView(
  application: ApplicationWithViewRelations,
): ApplicantApplicationView {
  return {
    ...toEndorsementView(application),
    status: application.status,
    endorsedAt: application.endorsedAt ? application.endorsedAt.toISOString() : null,
    approvedAt: application.approvedAt ? application.approvedAt.toISOString() : null,
    expiresAt: application.expiresAt ? application.expiresAt.toISOString() : null,
  };
}
