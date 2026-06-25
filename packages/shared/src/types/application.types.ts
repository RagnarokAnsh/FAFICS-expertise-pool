import { ApplicationStatus } from '../enums/application-status.enum';

/**
 * Summary shape for the admin applications list table.
 * Returned by GET /admin/applications.
 */
export interface ApplicationSummary {
  id: string;
  referenceNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  associationName: string;
  associationCountry: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  endorsedAt: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  preferredAreas: string[];
}

/**
 * Full application detail for the admin detail view.
 * Returned by GET /admin/applications/:id.
 */
export interface ApplicationDetail {
  id: string;
  referenceNumber: string | null;
  uidNumber: string | null;
  status: ApplicationStatus;

  // Personal
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  secondNationality: string | null;
  gender: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  separationDate: string;

  // Association
  associationName: string;
  associationCountry: string;
  associationGeneralEmail: string | null;
  presidentEmail: string;
  presidentPhone: string;
  associateMemberName: string | null;
  associateMemberCountry: string | null;

  // Experience summaries
  unExperienceSummary: string | null;
  nonUnExperienceSummary: string | null;
  faficsExperienceSummary: string | null;
  localExperienceSummary: string | null;

  // Position / committee preference
  preferredCommittees: string[];
  preferredCommitteesOther: string | null;
  positionPreferenceRationale: string | null;

  // Core competencies (top 5)
  competencies: string[];

  // Review notes
  presidentNotes: string | null;
  secretaryNotes: string | null;

  // Consent
  consentData: boolean;
  consentAccurate: boolean;
  consentedAt: string | null;

  // Timestamps
  submittedAt: string | null;
  endorsedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  educations: EducationRow[];
  languages: LanguageRow[];
  unExperiences: UnExperienceRow[];
  nonUnExperiences: NonUnExperienceRow[];
  faficsExperiences: FaficsExperienceRow[];
  localExperiences: LocalExperienceRow[];
  expertise: ExpertiseRow[];
  auditLogs: AuditLogEntry[];
}

export interface EducationRow {
  id: string;
  sortOrder: number;
  degreeName: string;
  institution: string;
}

export interface LanguageRow {
  id: string;
  sortOrder: number;
  language: string;
  proficiency: string;
}

export interface UnExperienceRow {
  id: string;
  sortOrder: number;
  agency: string;
  positionTitle: string;
  grade: string | null;
  areaOfExpertise: string | null;
  durationYears: number | null;
}

export interface NonUnExperienceRow {
  id: string;
  sortOrder: number;
  organization: string;
  positionTitle: string;
  areaOfExpertise: string | null;
  durationYears: number | null;
}

export interface FaficsExperienceRow {
  id: string;
  sortOrder: number;
  positionHeld: string;
  areaOfContribution: string | null;
  areaOfContributionOther: string | null;
  durationYears: number | null;
}

export interface LocalExperienceRow {
  id: string;
  sortOrder: number;
  positionHeld: string;
  areaOfContribution: string | null;
  durationYears: number | null;
}

export interface ExpertiseRow {
  id: string;
  sortOrder: number;
  areaKey: string;
  areaLabel: string;
  expertiseLevel: string | null;
  isPreferred: boolean;
  isCustom: boolean;
  customIndex: number | null;
  otherDescription: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
