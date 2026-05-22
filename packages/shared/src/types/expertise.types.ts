import { ExpertiseLevel } from '../enums/expertise-level.enum';

/**
 * Expertise area definition used by both the form and the API.
 */
export interface ExpertiseAreaDefinition {
  key: string;
  label: string;
  isCustom: boolean;
}

/**
 * Expertise assessment entry as returned by the API.
 */
export interface ExpertiseAssessment {
  areaKey: string;
  areaLabel: string;
  expertiseLevel: ExpertiseLevel | null;
  isPreferred: boolean;
  isCustom: boolean;
  customIndex: number | null;
  otherDescription: string | null;
}
