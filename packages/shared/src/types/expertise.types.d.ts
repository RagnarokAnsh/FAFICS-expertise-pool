import { ExpertiseLevel } from '../enums/expertise-level.enum';
export interface ExpertiseAreaDefinition {
    key: string;
    label: string;
    isCustom: boolean;
}
export interface ExpertiseAssessment {
    areaKey: string;
    areaLabel: string;
    expertiseLevel: ExpertiseLevel | null;
    isPreferred: boolean;
    isCustom: boolean;
    customIndex: number | null;
    otherDescription: string | null;
}
