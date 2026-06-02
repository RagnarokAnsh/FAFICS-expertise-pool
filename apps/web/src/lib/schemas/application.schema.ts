import { z } from 'zod';

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  middleName: z.string().nullish(),
  lastName: z.string().min(1, 'Last Name is required'),
  dateOfBirth: z.string().min(1, 'Date of Birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  secondNationality: z.string().nullish(),
  gender: z.string().min(1, 'Gender is required'),
  phone: z.string().min(1, 'Phone Number is required'),
  whatsapp: z.string().nullish(),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  separationDate: z.string().min(1, 'Date of Separation is required'),
});

export const associationSchema = z.object({
  // UUID will be populated by the frontend mapping or selection
  associationId: z.string().uuid('Association ID must be a valid UUID').nullish(),
  associationName: z.string().min(1, 'Association Name is required'),
  associationCountry: z.string().min(1, 'Association Country is required'),
  associationGeneralEmail: z.union([z.string().email('Invalid email'), z.literal('')]).nullish(),
  presidentEmail: z.string().email('Invalid email').min(1, 'President Email is required'),
  presidentPhone: z.string().min(1, 'President Phone is required'),
  associateMemberName: z.string().nullish(),
  associateMemberCountry: z.string().nullish(),
});

export const step1Schema = z.object({
  personal: personalInfoSchema,
  association: associationSchema,
});

export const educationSchema = z.object({
  degreeName: z.string().min(1, 'Degree Name is required'),
  institution: z.string().min(1, 'Institution is required'),
  sortOrder: z.number().default(1),
});

export const languageSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  proficiency: z.enum(['mother_tongue', 'proficient', 'working_level', 'basic'], {
    message: 'Proficiency Level is required',
  }),
  sortOrder: z.number().default(1),
});

export const step2Schema = z.object({
  educations: z.array(educationSchema).min(1, 'At least one education qualification is required'),
  languages: z.array(languageSchema).min(1, 'At least one working language is required'),
});

export const unExperienceSchema = z.object({
  agency: z.string().min(1, 'Agency is required'),
  positionTitle: z.string().min(1, 'Position Title is required'),
  grade: z.string().nullish(),
  areaOfExpertise: z.string().nullish(),
  durationYears: z.number().nullish(),
  sortOrder: z.number().default(1),
});

export const nonUnExperienceSchema = z.object({
  organization: z.string().min(1, 'Organization is required'),
  positionTitle: z.string().min(1, 'Position Title is required'),
  areaOfExpertise: z.string().nullish(),
  durationYears: z.number().nullish(),
  sortOrder: z.number().default(1),
});

export const faficsExperienceSchema = z.object({
  positionHeld: z.string().min(1, 'Position Held is required'),
  areaOfContribution: z.string().nullish(),
  durationYears: z.number().nullish(),
  sortOrder: z.number().default(1),
});

export const localExperienceSchema = z.object({
  positionHeld: z.string().min(1, 'Position Held is required'),
  areaOfContribution: z.string().nullish(),
  durationYears: z.number().nullish(),
  sortOrder: z.number().default(1),
});

export const step3Schema = z.object({
  unExperiences: z.array(unExperienceSchema).min(1, 'At least one UN experience is required'),
  nonUnExperiences: z.array(nonUnExperienceSchema).optional(),
  faficsExperiences: z.array(faficsExperienceSchema).optional(),
  localExperiences: z.array(localExperienceSchema).optional(),
  unExperienceSummary: z.string().nullish(),
  nonUnExperienceSummary: z.string().nullish(),
  faficsExperienceSummary: z.string().nullish(),
  localExperienceSummary: z.string().nullish(),
});

export const expertiseSchema = z.object({
  areaKey: z.string(),
  areaLabel: z.string(),
  expertiseLevel: z.enum(['average', 'advanced', 'expert']).nullish(),
  isPreferred: z.boolean().default(false),
  isCustom: z.boolean().default(false),
  customIndex: z.number().nullish(),
  sortOrder: z.number().default(1),
  otherDescription: z.string().nullish(),
});

export const step4Schema = z.object({
  expertise: z.array(expertiseSchema).min(1, 'Please assess your expertise'),
});

export const step5Schema = z.object({
  consentData: z.literal(true, {
    error: 'You must consent to data processing',
  }),
  consentAccurate: z.literal(true, {
    error: 'You must confirm your information is accurate',
  }),
});

export const applicationSchema = z.object({}).merge(step1Schema).merge(step2Schema).merge(step3Schema).merge(step4Schema).merge(step5Schema);
export type ApplicationData = z.infer<typeof applicationSchema>;
