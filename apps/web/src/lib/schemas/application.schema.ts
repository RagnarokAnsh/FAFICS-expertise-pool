import { z } from 'zod';

/** Whole years between a past date and today. */
function ageInYears(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Parses a yyyy-mm-dd string into a local Date, or null if invalid. */
function parseDate(value: string): Date | null {
  if (!value) return null;
  // `new Date("2026-06-05")` parses as UTC midnight, but startOfToday() is
  // LOCAL midnight. In a UTC+ timezone that makes today's date resolve to an
  // instant *after* local midnight, so a date-of-separation of "today" wrongly
  // trips the "cannot be in the future" check. Build the date from its parts so
  // it is local midnight, matching startOfToday().
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** A phone number must carry an international dial code and enough digits. */
const phoneNumber = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => /^\+\d/.test(v.trim()), {
      message: 'Select a country code',
    })
    .refine((v) => (v.replace(/\D/g, '').length >= 8), {
      message: 'Enter a valid phone number',
    });

export const personalInfoSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required'),
    middleName: z.string().nullish(),
    lastName: z.string().min(1, 'Last Name is required'),
    dateOfBirth: z.string().min(1, 'Date of Birth is required'),
    nationality: z.string().min(1, 'Nationality is required'),
    secondNationality: z.string().nullish(),
    gender: z.string().min(1, 'Gender is required'),
    phone: phoneNumber('Phone Number'),
    whatsapp: z
      .string()
      .nullish()
      .refine((v) => !v || /^\+\d/.test(v.trim()), { message: 'Select a country code' })
      .refine((v) => !v || v.replace(/\D/g, '').length >= 8, {
        message: 'Enter a valid phone number',
      }),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    separationDate: z.string().min(1, 'Date of Separation is required'),
  })
  .superRefine((data, ctx) => {
    const today = startOfToday();
    const dob = parseDate(data.dateOfBirth);
    if (data.dateOfBirth) {
      if (!dob) {
        ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Invalid date' });
      } else if (dob > today) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateOfBirth'],
          message: 'Date of Birth cannot be in the future',
        });
      } else if (ageInYears(dob) < 18) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateOfBirth'],
          message: 'Applicant must be at least 18 years old',
        });
      } else if (ageInYears(dob) > 120) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateOfBirth'],
          message: 'Please enter a valid Date of Birth',
        });
      }
    }

    const sep = parseDate(data.separationDate);
    if (data.separationDate) {
      if (!sep) {
        ctx.addIssue({ code: 'custom', path: ['separationDate'], message: 'Invalid date' });
      } else if (sep > today) {
        ctx.addIssue({
          code: 'custom',
          path: ['separationDate'],
          message: 'Date of Separation cannot be in the future',
        });
      } else if (dob && sep < dob) {
        ctx.addIssue({
          code: 'custom',
          path: ['separationDate'],
          message: 'Date of Separation must be after Date of Birth',
        });
      }
    }
  });

export const associationSchema = z.object({
  // UUID will be populated by the frontend mapping or selection
  associationId: z.string().uuid('Association ID must be a valid UUID').nullish(),
  associationName: z.string().min(1, 'Association Name is required'),
  associationCountry: z.string().min(1, 'Association Country is required'),
  associationGeneralEmail: z.union([z.string().email('Invalid email'), z.literal('')]).nullish(),
  presidentEmail: z.string().min(1, 'President Email is required').email('Invalid email'),
  presidentPhone: phoneNumber('President Phone'),
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
  // Optional position/committee preference (client feedback). Lets an applicant
  // signal interest so committee chairs can find them in the pool.
  preferredCommittees: z.array(z.string()).optional().default([]),
  positionPreferenceRationale: z.string().nullish(),
});

export const step5Schema = z.object({
  consentData: z.literal(true, {
    error: 'You must consent to data processing',
  }),
  consentAccurate: z.literal(true, {
    error: 'You must confirm your information is accurate',
  }),
});

export const applicationSchema = z
  .object({})
  .merge(step1Schema)
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .superRefine((data, ctx) => {
    // A language may only be listed once.
    const seen = new Map<string, number>();
    (data.languages ?? []).forEach((lang, idx) => {
      const key = lang.language?.trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['languages', idx, 'language'],
          message: 'This language is already selected',
        });
      } else {
        seen.set(key, idx);
      }
    });
  });
export type ApplicationData = z.infer<typeof applicationSchema>;
