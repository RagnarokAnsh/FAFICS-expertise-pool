export interface AnalyticsItem {
  label: string;
  count: number;
}

export interface AnalyticsResponse {
  expertiseDistribution: AnalyticsItem[];
  nationalityBreakdown: AnalyticsItem[];
  genderBalance: AnalyticsItem[];
  languageCoverage: AnalyticsItem[];
  gradeDistribution: AnalyticsItem[];
}
