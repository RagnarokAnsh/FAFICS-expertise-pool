/**
 * Language proficiency levels.
 * Matches the PostgreSQL proficiency_level enum and Prisma ProficiencyLevel.
 * Updated in v2 to match fafics_form_v2_1.html dropdown exactly.
 */
export enum ProficiencyLevel {
  MOTHER_TONGUE = 'mother_tongue',
  PROFICIENT = 'proficient',
  WORKING_LEVEL = 'working_level',
  BASIC = 'basic',
}
