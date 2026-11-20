export const UN_AGENCIES = [
  "UN", "FAO", "IAEA", "ICAO", "IFAD", "ILO", "IMF", "IMO", "IOM", "ITU", "UNAIDS", "UNCDF", "UNCTAD", "UNDP", "UNEP", "UNESCO", "UNFPA", "UN-HABITAT", "UNHCR", "UNICEF", "UNIDO", "UNITAR", "UNODC", "UNOPS", "UNRWA", "UNU", "UN Women", "UNWTO", "UPU", "WFP", "WHO", "WIPO", "WMO", "World Bank Group", "Other (Please specify)"
];

export const UN_GRADES = [
  "USG", "ASG", "D-2", "D-1", "P-5", "P-4", "P-3", "P-2", "P-1", "NO", "GS", "Other"
];

export const FAFICS_ROLES = [
  "President", "Vice-President", "Secretary", "Treasurer", "Committee Chair", "Committee Member", "Working Group Member", "Delegate", "Other"
];

// FAFICS committees / delegations / working groups — authoritative list
// supplied by the client. Used for the FAFICS "Area of Contribution"
// multi-select (Step 3) and the position/committee preference (Step 4).
// The hierarchical groups ("FAFICS Representation on…", "Council & Bureau
// Groups") are flattened with a prefix so each is individually selectable.
// "Other" reveals a free-text field for committees not listed.
export const FAFICS_COMMITTEES = [
  "FAFICS Standing Committee on Pension Issues",
  "FAFICS Standing Committee on ASHIL",
  "FAFICS Standing Committee on Membership",
  "FAFICS Standing Committee on Communication",
  "FAFICS delegation to the Pension Board",
  "FAFICS Representation — Audit Committee",
  "FAFICS Representation — Budget Committee",
  "FAFICS Representation — Fund Solvency and Assets and Liabilities Monitoring Committee (FSALM)",
  "FAFICS Representation — Succession Planning and Evaluation Committee",
  "FAFICS Representation — Governance Review Working Group",
  "FAFICS Representation — Plan Review Working Group",
  "FAFICS Council & Bureau Group — Succession Planning Working Group",
  "FAFICS Council & Bureau Group — Election Support Group",
  "Other",
];

// Core competencies for the "select your top 5 core strengths" section (Step 4).
// PLACEHOLDER — the client's final competencies list is due end of week; replace
// the entries below when it arrives. Seeded from the soft/relational skills.
export const COMPETENCIES = [
  "Networking / Partnerships",
  "Alliance / Coalition Building",
  "Advocacy / Outreach",
  "Negotiation / Mediation",
  "Volunteer / Community Engagement",
  "Strategic Planning",
  "Communication / Public Speaking",
  "Team Leadership",
  "Problem Solving",
  "Mentoring / Capacity Building",
];

// Max competencies an applicant may select (client: "top 5 core strengths").
export const MAX_COMPETENCIES = 5;

// The FAFICS contribution / committee option that reveals a free-text field.
export const COMMITTEE_OTHER = "Other";

// Experience duration buckets (Step 3). The API stores each bucket's UPPER
// bound, so 5 means "3-5 years" and 99 is the "20+ years" sentinel.
export const DURATION_OPTIONS = [
  { value: 0.5, label: '< 1 year' },
  { value: 1.0, label: '1 year' },
  { value: 2.0, label: '2 years' },
  { value: 5.0, label: '3-5 years' },
  { value: 10.0, label: '6-10 years' },
  { value: 20.0, label: '11-20 years' },
  { value: 99.0, label: '20+ years' },
];

/** The label the applicant picked for a stored duration ("3-5 years"), or "-". */
export function durationLabel(value: number | string | null | undefined): string {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return DURATION_OPTIONS.find((d) => d.value === n)?.label ?? `${n} year${n === 1 ? '' : 's'}`;
}

export const AREAS_OF_EXPERTISE = [
  "Administration / Operations",
  "Finance / Budget",
  "Human Resources",
  "Information Technology",
  "Legal Affairs",
  "Logistics / Procurement",
  "Management / Leadership",
  "Medical / Health",
  "Pensions / Insurance",
  "Policy / Governance",
  "Public Information / Comms",
  "Other"
];
