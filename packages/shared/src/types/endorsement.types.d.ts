import { EducationRow, LanguageRow, UnExperienceRow, NonUnExperienceRow, FaficsExperienceRow, LocalExperienceRow, ExpertiseRow } from './application.types';
export interface EndorsementView {
    referenceNumber: string;
    applicantFullName: string;
    email: string;
    nationality: string;
    secondNationality: string | null;
    gender: string;
    phone: string;
    dateOfBirth: string;
    separationDate: string;
    associationName: string;
    associationCountry: string;
    educations: EducationRow[];
    languages: LanguageRow[];
    unExperiences: UnExperienceRow[];
    nonUnExperiences: NonUnExperienceRow[];
    faficsExperiences: FaficsExperienceRow[];
    localExperiences: LocalExperienceRow[];
    expertise: ExpertiseRow[];
    unExperienceSummary: string | null;
    nonUnExperienceSummary: string | null;
    faficsExperienceSummary: string | null;
    localExperienceSummary: string | null;
    submittedAt: string | null;
}
