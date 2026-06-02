/* eslint-disable no-console */
// =============================================================================
// FAFICS — Comprehensive DEV seeder
//
// Builds a full demo dataset so you can walk the ENTIRE application lifecycle
// AND see the analytics / charts populated with meaningful, varied data.
//
//   draft → submitted → endorsed → under_review → approved / rejected
//                    ↘ changes_requested            approved → expired
//
// What it creates:
//   • Officer accounts: admin, secretary, committee (password login)
//   • ~8 associations, each with a president user (magic-link endorser)
//   • One application in EVERY lifecycle status (flow testing)
//   • A POOL of ~22 additional APPROVED profiles with diverse nationality,
//     gender, languages, expertise areas and UN grades — so every analytics
//     chart (expertise, nationality, gender, language, grade) is populated.
//   • A few approved profiles that expire within 90 days (Expiring page data)
//   • Full nested data per app: education, languages, 4 experience tables,
//     expertise self-assessment (fixed areas + custom "Other" + ≤3 preferred)
//   • Reference/UID numbers via the real fn_generate_* SQL functions
//   • A LIVE, deterministic president-review magic token for the `submitted`
//     app — the /endorse/<token> URL is printed and stays stable across reseeds
//   • Audit-log trail for every status transition
//   • Notification logs, including one FAILED send (test admin retry)
//
// ⚠️  DESTRUCTIVE: wipes applications, users, associations, tokens and logs
//     before reseeding. Local/dev databases only.
//
// Run:  npm run db:seed:dev --workspace=@fafics/api
// =============================================================================

import {
  PrismaClient,
  UserRole,
  ApplicationStatus,
  ProficiencyLevel,
  ExpertiseLevel,
  TokenPurpose,
  NotificationType,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ── Tunables ─────────────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'changeme123!';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const APPROVED_POOL_SIZE = Number(process.env.SEED_POOL_SIZE || 22);
// Deterministic dev token for the SUBMITTED app's president-review link, so the
// /endorse/<token> URL stays IDENTICAL across reseeds (a bookmark never goes stale).
const PRESIDENT_TOKEN = process.env.SEED_PRESIDENT_TOKEN || 'deadbeef'.repeat(8);

// The 11 fixed expertise areas (mirror of apps/web/src/lib/constants/expertise.ts).
const FIXED_EXPERTISE_AREAS = [
  { key: 'governance', label: 'Governance / Leadership / Management' },
  { key: 'pension', label: 'Pension Fund Matters / Policy' },
  { key: 'actuarial', label: 'Actuarial / Financial Analysis' },
  { key: 'audit', label: 'Audit' },
  { key: 'budget', label: 'Budget' },
  { key: 'comms', label: 'Communications / PR' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'it', label: 'IT / Information Systems' },
  { key: 'legal', label: 'Legal' },
  { key: 'medical', label: 'Medical / Health Services' },
  { key: 'procurement', label: 'Procurement / Logistics' },
];

// ── Date helpers ─────────────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000);
const addYears = (date: Date, y: number) =>
  new Date(date.getFullYear() + y, date.getMonth(), date.getDate());

// ── Reference data pools (for the generated approved pool) ───────────────────
const COUNTRIES: { nat: string; native: string }[] = [
  { nat: 'France', native: 'French' },
  { nat: 'Brazil', native: 'Portuguese' },
  { nat: 'Kenya', native: 'Swahili' },
  { nat: 'Japan', native: 'Japanese' },
  { nat: 'Nigeria', native: 'English' },
  { nat: 'Egypt', native: 'Arabic' },
  { nat: 'Sweden', native: 'Swedish' },
  { nat: 'India', native: 'Hindi' },
  { nat: 'Italy', native: 'Italian' },
  { nat: 'Germany', native: 'German' },
  { nat: 'Argentina', native: 'Spanish' },
  { nat: 'China', native: 'Chinese' },
  { nat: 'Senegal', native: 'French' },
  { nat: 'Morocco', native: 'Arabic' },
  { nat: 'Russia', native: 'Russian' },
  { nat: 'Philippines', native: 'English' },
  { nat: 'Colombia', native: 'Spanish' },
  { nat: 'Ghana', native: 'English' },
  { nat: 'Spain', native: 'Spanish' },
  { nat: 'Canada', native: 'English' },
];

const FEMALE_FIRST = ['Marie', 'Sofia', 'Ingrid', 'Mei', 'Chloé', 'Ana', 'Nadia', 'Lakshmi', 'Olga', 'Rosa', 'Hannah', 'Amina'];
const MALE_FIRST = ['Diego', 'Pierre', 'Marco', 'Tariq', 'Daniel', 'Yusuf', 'Sven', 'Paulo', 'Rajesh', 'Omar', 'Kwame', 'Hiroshi'];
const LAST = ['Rossi', 'Müller', 'Santos', 'Diallo', 'Khan', 'Ivanova', 'Garcia', 'Cohen', 'Osei', 'Reyes', 'Nguyen', 'Andersson', 'Haddad', 'Costa', 'Mwangi', 'Lindqvist', 'Moreau', 'Bianchi', 'Park', 'Silva', 'Adeyemi', 'Tremblay'];

const AGENCIES = ['UNDP', 'UNICEF', 'WHO', 'WFP', 'UNHCR', 'FAO', 'ILO', 'UNESCO', 'UN Secretariat', 'IAEA', 'UNFPA', 'UN Women', 'UNEP'];
// Weighted toward mid/senior grades, which is realistic for a retiree pool.
const GRADE_POOL = ['P-3', 'P-4', 'P-4', 'P-5', 'P-5', 'P-5', 'D-1', 'D-1', 'D-2', 'ASG', 'USG'];
const THIRD_LANGS: { lang: string; prof: ProficiencyLevel }[] = [
  { lang: 'French', prof: ProficiencyLevel.working_level },
  { lang: 'Spanish', prof: ProficiencyLevel.working_level },
  { lang: 'Arabic', prof: ProficiencyLevel.basic },
  { lang: 'Russian', prof: ProficiencyLevel.basic },
  { lang: 'Chinese', prof: ProficiencyLevel.basic },
];

// ── Spec types ───────────────────────────────────────────────────────────────
interface LangSpec { language: string; proficiency: ProficiencyLevel }
interface UnExpSpec { agency: string; positionTitle: string; grade: string; areaOfExpertise: string; durationYears: string }
interface ExpSpec { key: string; label: string; level: ExpertiseLevel; preferred: boolean }

interface ApplicantSpec {
  status: ApplicationStatus;
  associationIndex: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  secondNationality?: string;
  gender: string;
  separationDate: string;
  languages: LangSpec[];
  unExp: UnExpSpec[];
  expertise: ExpSpec[];
  customExpertise?: string;
  approvedDaysAgo?: number; // for approved profiles — controls approved/expiry dates
}

// ── Associations ─────────────────────────────────────────────────────────────
interface AssociationSeed {
  id: string; name: string; country: string; generalEmail: string;
  presidentEmail: string; presidentPhone: string; presidentFirst: string; presidentLast: string;
}
const ASSOCIATIONS: AssociationSeed[] = [
  { id: '00000000-0000-4000-a000-000000000001', name: 'AFICS Geneva', country: 'Switzerland', generalEmail: 'office@afics-geneva.org', presidentEmail: 'president.geneva@example.org', presidentPhone: '+41 22 555 0101', presidentFirst: 'Hélène', presidentLast: 'Dubois' },
  { id: '00000000-0000-4000-a000-000000000002', name: 'AFICS New York', country: 'United States', generalEmail: 'office@afics-ny.org', presidentEmail: 'president.ny@example.org', presidentPhone: '+1 212 555 0102', presidentFirst: 'Marcus', presidentLast: 'Hale' },
  { id: '00000000-0000-4000-a000-000000000003', name: 'AFICS Nairobi', country: 'Kenya', generalEmail: 'office@afics-nairobi.org', presidentEmail: 'president.nairobi@example.org', presidentPhone: '+254 20 555 0103', presidentFirst: 'Amina', presidentLast: 'Otieno' },
  { id: '00000000-0000-4000-a000-000000000004', name: 'AFICS Vienna', country: 'Austria', generalEmail: 'office@afics-vienna.org', presidentEmail: 'president.vienna@example.org', presidentPhone: '+43 1 555 0104', presidentFirst: 'Klaus', presidentLast: 'Weber' },
  { id: '00000000-0000-4000-a000-000000000005', name: 'AFICS Rome', country: 'Italy', generalEmail: 'office@afics-rome.org', presidentEmail: 'president.rome@example.org', presidentPhone: '+39 06 555 0105', presidentFirst: 'Giulia', presidentLast: 'Bianchi' },
  { id: '00000000-0000-4000-a000-000000000006', name: 'AFICS Bangkok', country: 'Thailand', generalEmail: 'office@afics-bangkok.org', presidentEmail: 'president.bangkok@example.org', presidentPhone: '+66 2 555 0106', presidentFirst: 'Somchai', presidentLast: 'Phong' },
  { id: '00000000-0000-4000-a000-000000000007', name: 'AFICS New Delhi', country: 'India', generalEmail: 'office@afics-delhi.org', presidentEmail: 'president.delhi@example.org', presidentPhone: '+91 11 555 0107', presidentFirst: 'Anjali', presidentLast: 'Rao' },
  { id: '00000000-0000-4000-a000-000000000008', name: 'AFICS Montreal', country: 'Canada', generalEmail: 'office@afics-montreal.org', presidentEmail: 'president.montreal@example.org', presidentPhone: '+1 514 555 0108', presidentFirst: 'Louise', presidentLast: 'Tremblay' },
];

// ── Deterministic builders for nested data ───────────────────────────────────
function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

// Languages: native (mother tongue) + English + a rotating third (UN languages),
// so the language-coverage chart shows English high with a realistic long tail.
function buildLanguages(country: { nat: string; native: string }, i: number): LangSpec[] {
  const langs: LangSpec[] = [{ language: country.native, proficiency: ProficiencyLevel.mother_tongue }];
  if (country.native !== 'English') {
    langs.push({ language: 'English', proficiency: ProficiencyLevel.proficient });
  } else {
    langs.push({ language: 'French', proficiency: ProficiencyLevel.proficient });
  }
  const third = pick(THIRD_LANGS, i);
  if (!langs.some((l) => l.language === third.lang)) {
    langs.push({ language: third.lang, proficiency: third.prof });
  }
  return langs;
}

// Expertise: a rotating window over the fixed areas (offset by index so EVERY
// area gets coverage), but with a popularity bias toward Governance & Pension so
// the distribution chart shows a realistic ranking rather than flat equal bars.
// 2–3 areas are marked preferred (DB trigger caps preferred at 3).
function buildExpertise(i: number): ExpSpec[] {
  const out: ExpSpec[] = [];
  const add = (areaIdx: number) => {
    const area = pick(FIXED_EXPERTISE_AREAS, areaIdx);
    if (!out.some((e) => e.key === area.key)) out.push({ key: area.key, label: area.label, level: ExpertiseLevel.average, preferred: false });
  };
  // Popularity bias: most applicants list Governance; many list Pension.
  if (i % 3 !== 0) add(0); // governance (~67%)
  if (i % 2 === 0) add(1); // pension (~50%)
  const windowSize = 3 + (i % 3); // 3–5 areas total
  for (let k = 0; out.length < windowSize && k < FIXED_EXPERTISE_AREAS.length; k++) add(i + k);
  // Assign preferred + levels: first 2–3 areas are preferred, top one is expert.
  const prefCount = 2 + (i % 2);
  return out.map((e, k) => ({
    ...e,
    preferred: k < prefCount,
    level: k === 0 ? ExpertiseLevel.expert : k < prefCount ? ExpertiseLevel.advanced : k % 2 === 0 ? ExpertiseLevel.advanced : ExpertiseLevel.average,
  }));
}

// UN experience: 1–2 positions, the first carrying the applicant's headline grade.
function buildUnExp(i: number): UnExpSpec[] {
  const grade = pick(GRADE_POOL, i * 3 + 1);
  const area = pick(FIXED_EXPERTISE_AREAS, i + 2).label;
  const positions: UnExpSpec[] = [
    {
      agency: pick(AGENCIES, i),
      positionTitle: pick(['Senior Adviser', 'Chief of Section', 'Programme Director', 'Country Representative', 'Head of Unit'], i),
      grade,
      areaOfExpertise: area,
      durationYears: pick(['8.0', '10.0', '12.5', '15.0', '18.0', '20.0'], i),
    },
  ];
  if (i % 2 === 0) {
    positions.push({
      agency: pick(AGENCIES, i + 4),
      positionTitle: pick(['Programme Officer', 'Field Coordinator', 'Technical Specialist'], i),
      grade: pick(['P-3', 'P-4', 'P-5'], i),
      areaOfExpertise: pick(FIXED_EXPERTISE_AREAS, i + 5).label,
      durationYears: pick(['4.0', '5.0', '6.0', '7.0'], i),
    });
  }
  return positions;
}

// Generate the diverse APPROVED pool that powers the analytics charts.
function buildApprovedPool(count: number): ApplicantSpec[] {
  const specs: ApplicantSpec[] = [];
  for (let i = 0; i < count; i++) {
    const female = i % 2 === 0;
    const country = pick(COUNTRIES, i);
    const firstName = female ? pick(FEMALE_FIRST, i) : pick(MALE_FIRST, i);
    const lastName = pick(LAST, i * 2 + (female ? 0 : 1));
    // Spread approvals over the last ~2 years; make a few expire within 90 days.
    const expiringSoon = i % 7 === 3; // ~3 of the pool
    const approvedDaysAgo = expiringSoon ? 1035 + (i % 20) : 30 + ((i * 31) % 640);
    specs.push({
      status: ApplicationStatus.approved,
      associationIndex: i % ASSOCIATIONS.length,
      firstName,
      lastName,
      dateOfBirth: `19${50 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}`,
      nationality: country.nat,
      gender: female ? 'Female' : 'Male',
      separationDate: `20${10 + (i % 12)}-06-30`,
      languages: buildLanguages(country, i),
      unExp: buildUnExp(i),
      expertise: buildExpertise(i),
      customExpertise: i % 5 === 0 ? pick(['Disaster Risk Reduction', 'Field Security', 'Gender Mainstreaming', 'Climate Policy'], i) : undefined,
      approvedDaysAgo,
    });
  }
  return specs;
}

// ── One curated applicant per lifecycle status (flow testing) ────────────────
function buildFlowApplicants(): ApplicantSpec[] {
  const mk = (
    status: ApplicationStatus,
    associationIndex: number,
    firstName: string,
    lastName: string,
    nationality: string,
    native: string,
    gender: string,
    seed: number,
    extra: Partial<ApplicantSpec> = {},
  ): ApplicantSpec => ({
    status,
    associationIndex,
    firstName,
    lastName,
    nationality,
    gender,
    dateOfBirth: `195${seed % 9}-03-12`,
    separationDate: `201${seed % 9}-03-31`,
    languages: buildLanguages({ nat: nationality, native }, seed),
    unExp: buildUnExp(seed),
    expertise: buildExpertise(seed),
    ...extra,
  });

  return [
    mk(ApplicationStatus.draft, 0, 'Priya', 'Nair', 'India', 'Hindi', 'Female', 1),
    mk(ApplicationStatus.submitted, 0, 'Carlos', 'Mendes', 'Brazil', 'Portuguese', 'Male', 2, { middleName: 'Eduardo', secondNationality: 'Portugal', customExpertise: 'Disaster Risk Reduction' }),
    mk(ApplicationStatus.changes_requested, 1, 'Fatima', 'Al-Sayed', 'Egypt', 'Arabic', 'Female', 3),
    mk(ApplicationStatus.endorsed, 1, 'Johan', 'Berg', 'Sweden', 'Swedish', 'Male', 4),
    mk(ApplicationStatus.under_review, 2, 'Grace', 'Wanjiru', 'Kenya', 'Swahili', 'Female', 5, { customExpertise: 'Field Security Coordination' }),
    mk(ApplicationStatus.rejected, 0, 'Yuki', 'Tanaka', 'Japan', 'Japanese', 'Female', 6),
    mk(ApplicationStatus.expired, 1, 'Anton', 'Petrov', 'Bulgaria', 'Russian', 'Male', 7, { approvedDaysAgo: 1190 }),
  ];
}

// ── Lifecycle timestamps / notes per status ──────────────────────────────────
function lifecycle(spec: ApplicantSpec) {
  const status = spec.status;
  const ts: Record<string, any> = {};
  if (status !== ApplicationStatus.draft) {
    ts.consentedAt = daysAgo(40);
    ts.submittedAt = daysAgo(40);
  }
  switch (status) {
    case ApplicationStatus.changes_requested:
      ts.presidentNotes = 'Please clarify your separation date and add your most recent UN posting.';
      break;
    case ApplicationStatus.endorsed:
      ts.endorsedAt = daysAgo(30);
      ts.presidentNotes = 'Endorsed — a long-standing and active member.';
      break;
    case ApplicationStatus.under_review:
      ts.endorsedAt = daysAgo(30);
      ts.presidentNotes = 'Endorsed.';
      ts.secretaryNotes = 'Verifying UN service record with the Pension Fund.';
      break;
    case ApplicationStatus.rejected:
      ts.endorsedAt = daysAgo(30);
      ts.rejectedAt = daysAgo(15);
      ts.presidentNotes = 'Endorsed.';
      ts.secretaryNotes = 'Insufficient documented UN experience for the Expertise Pool.';
      break;
    case ApplicationStatus.approved:
    case ApplicationStatus.expired: {
      const approvedAt = daysAgo(spec.approvedDaysAgo ?? 60);
      ts.submittedAt = daysAgo((spec.approvedDaysAgo ?? 60) + 20);
      ts.consentedAt = ts.submittedAt;
      ts.endorsedAt = daysAgo((spec.approvedDaysAgo ?? 60) + 10);
      ts.approvedAt = approvedAt;
      ts.expiresAt = addYears(approvedAt, 3);
      ts.presidentNotes = 'Endorsed.';
      ts.secretaryNotes = 'All credentials verified. Added to the roster.';
      break;
    }
  }
  return ts;
}

// ── Build the nested create payload from a spec ──────────────────────────────
function nestedData(spec: ApplicantSpec) {
  const educations: Prisma.ApplicationEducationCreateWithoutApplicationInput[] = [
    { sortOrder: 1, degreeName: 'MSc Public Administration', institution: `University of ${spec.nationality}` },
    { sortOrder: 2, degreeName: 'BA Economics', institution: 'London School of Economics' },
  ];
  const languages: Prisma.ApplicationLanguageCreateWithoutApplicationInput[] = spec.languages.map((l, idx) => ({
    sortOrder: idx + 1,
    language: l.language,
    proficiency: l.proficiency,
  }));
  const unExperiences: Prisma.ApplicationUnExperienceCreateWithoutApplicationInput[] = spec.unExp.map((e, idx) => ({
    sortOrder: idx + 1,
    agency: e.agency,
    positionTitle: e.positionTitle,
    grade: e.grade,
    areaOfExpertise: e.areaOfExpertise,
    durationYears: new Prisma.Decimal(e.durationYears),
  }));
  const nonUnExperiences: Prisma.ApplicationNonUnExperienceCreateWithoutApplicationInput[] = [
    { sortOrder: 1, organization: 'National Planning Commission', positionTitle: 'Policy Advisor', areaOfExpertise: 'Public Policy', durationYears: new Prisma.Decimal('4.0') },
  ];
  const faficsExperiences: Prisma.ApplicationFaficsExperienceCreateWithoutApplicationInput[] = [
    { sortOrder: 1, positionHeld: 'Committee Member', areaOfContribution: 'Pension Advocacy', durationYears: new Prisma.Decimal('3.0') },
  ];
  const localExperiences: Prisma.ApplicationLocalExperienceCreateWithoutApplicationInput[] = [
    { sortOrder: 1, positionHeld: 'Treasurer', areaOfContribution: 'Local Association Finance', durationYears: new Prisma.Decimal('99.0') },
  ];
  const expertise: Prisma.ApplicationExpertiseCreateWithoutApplicationInput[] = spec.expertise.map((e, idx) => ({
    sortOrder: idx + 1,
    areaKey: e.key,
    areaLabel: e.label,
    expertiseLevel: e.level,
    isPreferred: e.preferred,
  }));
  if (spec.customExpertise) {
    expertise.push({
      sortOrder: expertise.length + 1,
      areaKey: 'other',
      areaLabel: spec.customExpertise,
      expertiseLevel: ExpertiseLevel.expert,
      isPreferred: false,
      isCustom: true,
      customIndex: 1,
      otherDescription: spec.customExpertise,
    });
  }
  return { educations, languages, unExperiences, nonUnExperiences, faficsExperiences, localExperiences, expertise };
}

async function wipe() {
  console.log('🧹 Wiping existing data…');
  await prisma.notificationLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.magicToken.deleteMany();
  await prisma.application.deleteMany(); // cascades nested rows
  await prisma.association.updateMany({ data: { presidentUserId: null } });
  await prisma.user.deleteMany();
  await prisma.association.deleteMany();
  await prisma.$executeRawUnsafe('ALTER SEQUENCE application_ref_seq RESTART WITH 1');
  await prisma.$executeRawUnsafe('ALTER SEQUENCE application_uid_seq RESTART WITH 1');
}

async function main() {
  await wipe();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ── Officers ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({ data: { email: 'admin@fafics.org', passwordHash, role: UserRole.admin, firstName: 'System', lastName: 'Admin', emailVerifiedAt: now } });
  const secretary = await prisma.user.create({ data: { email: 'secretary@fafics.org', passwordHash, role: UserRole.secretary, firstName: 'Sara', lastName: 'Keeper', emailVerifiedAt: now } });
  await prisma.user.create({ data: { email: 'committee@fafics.org', passwordHash, role: UserRole.committee, firstName: 'Colin', lastName: 'Mittee', emailVerifiedAt: now } });
  console.log('✓ Officers: admin@fafics.org, secretary@fafics.org, committee@fafics.org');

  // ── Associations + presidents ───────────────────────────────────────────────
  for (const a of ASSOCIATIONS) {
    const association = await prisma.association.create({ data: { id: a.id, name: a.name, country: a.country, email: a.generalEmail, phone: a.presidentPhone, isActive: true } });
    const president = await prisma.user.create({ data: { email: a.presidentEmail, role: UserRole.president, firstName: a.presidentFirst, lastName: a.presidentLast, associationId: association.id, emailVerifiedAt: now } });
    await prisma.association.update({ where: { id: association.id }, data: { presidentUserId: president.id } });
  }
  console.log(`✓ ${ASSOCIATIONS.length} associations with president users`);

  // ── Applications: flow set + approved pool ──────────────────────────────────
  const applicants = [...buildFlowApplicants(), ...buildApprovedPool(APPROVED_POOL_SIZE)];
  let livePresidentTokenUrl: string | null = null;
  const statusTally: Record<string, number> = {};

  for (let idx = 0; idx < applicants.length; idx++) {
    const spec = applicants[idx];
    const assoc = ASSOCIATIONS[spec.associationIndex];
    const ts = lifecycle(spec);
    const isDraft = spec.status === ApplicationStatus.draft;
    statusTally[spec.status] = (statusTally[spec.status] || 0) + 1;

    const email = `${spec.firstName}.${spec.lastName}.${idx}@example.com`.toLowerCase();
    const member = await prisma.user.create({ data: { email, role: UserRole.member, firstName: spec.firstName, lastName: spec.lastName, associationId: assoc.id } });

    let referenceNumber: string | null = null;
    let uidNumber: string | null = null;
    if (!isDraft) {
      const [{ fn_generate_reference_number }] = await prisma.$queryRaw<Array<{ fn_generate_reference_number: string }>>`SELECT fn_generate_reference_number() as fn_generate_reference_number`;
      const [{ fn_generate_uid }] = await prisma.$queryRaw<Array<{ fn_generate_uid: string }>>`SELECT fn_generate_uid() as fn_generate_uid`;
      referenceNumber = fn_generate_reference_number;
      uidNumber = fn_generate_uid;
    }

    const nested = nestedData(spec);
    const application = await prisma.application.create({
      data: {
        referenceNumber, uidNumber,
        userId: member.id, associationId: assoc.id, status: spec.status,
        firstName: spec.firstName, middleName: spec.middleName ?? null, lastName: spec.lastName,
        dateOfBirth: new Date(spec.dateOfBirth), nationality: spec.nationality, secondNationality: spec.secondNationality ?? null,
        gender: spec.gender, phone: `${assoc.presidentPhone.slice(0, 7)} 0${(900 + idx).toString()}`, email,
        separationDate: new Date(spec.separationDate),
        associationName: assoc.name, associationCountry: assoc.country, associationGeneralEmail: assoc.generalEmail,
        presidentEmail: assoc.presidentEmail, presidentPhone: assoc.presidentPhone,
        unExperienceSummary: 'Extensive UN service across multiple agencies and duty stations.',
        nonUnExperienceSummary: 'Government policy advisory roles prior to UN service.',
        faficsExperienceSummary: 'Active FAFICS committee contributor.',
        localExperienceSummary: 'Long-serving local association volunteer.',
        consentData: !isDraft, consentAccurate: !isDraft, consentedAt: ts.consentedAt ?? null,
        presidentNotes: ts.presidentNotes ?? null, secretaryNotes: ts.secretaryNotes ?? null,
        submittedAt: ts.submittedAt ?? null, endorsedAt: ts.endorsedAt ?? null, approvedAt: ts.approvedAt ?? null,
        rejectedAt: ts.rejectedAt ?? null, expiresAt: ts.expiresAt ?? null,
        educations: { create: nested.educations },
        languages: { create: nested.languages },
        unExperiences: { create: nested.unExperiences },
        nonUnExperiences: isDraft ? undefined : { create: nested.nonUnExperiences },
        faficsExperiences: isDraft ? undefined : { create: nested.faficsExperiences },
        localExperiences: isDraft ? undefined : { create: nested.localExperiences },
        expertise: { create: nested.expertise },
      },
    });

    // Audit trail
    const audit: Prisma.AuditLogCreateManyInput[] = [];
    if (!isDraft) audit.push({ applicationId: application.id, actorId: member.id, actorEmail: email, actorRole: UserRole.member, action: 'application.submitted', oldStatus: ApplicationStatus.draft, newStatus: ApplicationStatus.submitted, createdAt: ts.submittedAt ?? now });
    if (ts.endorsedAt) audit.push({ applicationId: application.id, actorEmail: assoc.presidentEmail, actorRole: UserRole.president, action: 'application.endorsed', oldStatus: ApplicationStatus.submitted, newStatus: ApplicationStatus.endorsed, createdAt: ts.endorsedAt });
    if (spec.status === ApplicationStatus.changes_requested) audit.push({ applicationId: application.id, actorEmail: assoc.presidentEmail, actorRole: UserRole.president, action: 'application.changes_requested', oldStatus: ApplicationStatus.submitted, newStatus: ApplicationStatus.changes_requested, metadata: { notes: ts.presidentNotes } as Prisma.InputJsonValue, createdAt: daysAgo(35) });
    if (spec.status === ApplicationStatus.under_review) audit.push({ applicationId: application.id, actorId: secretary.id, actorEmail: secretary.email, actorRole: UserRole.secretary, action: 'application.under_review', oldStatus: ApplicationStatus.endorsed, newStatus: ApplicationStatus.under_review, createdAt: daysAgo(10) });
    if (ts.approvedAt) audit.push({ applicationId: application.id, actorId: secretary.id, actorEmail: secretary.email, actorRole: UserRole.secretary, action: 'application.approved', oldStatus: ApplicationStatus.under_review, newStatus: ApplicationStatus.approved, createdAt: ts.approvedAt });
    if (ts.rejectedAt) audit.push({ applicationId: application.id, actorId: secretary.id, actorEmail: secretary.email, actorRole: UserRole.secretary, action: 'application.rejected', oldStatus: ApplicationStatus.endorsed, newStatus: ApplicationStatus.rejected, metadata: { reason: ts.secretaryNotes } as Prisma.InputJsonValue, createdAt: ts.rejectedAt });
    if (spec.status === ApplicationStatus.expired) audit.push({ applicationId: application.id, actorEmail: 'system@fafics.org', actorRole: UserRole.admin, action: 'system.expiry_run', oldStatus: ApplicationStatus.approved, newStatus: ApplicationStatus.expired, metadata: { reason: 'automatic_expiry' } as Prisma.InputJsonValue, createdAt: daysAgo(95) });
    if (audit.length) await prisma.auditLog.createMany({ data: audit });

    // Notification log (submission confirmation)
    if (!isDraft) await prisma.notificationLog.create({ data: { applicationId: application.id, recipientEmail: email, notificationType: NotificationType.submission_confirmation, providerMessageId: `seed-${referenceNumber}`, sentAt: ts.submittedAt ?? now } });

    // Live deterministic president token for the SUBMITTED app
    if (spec.status === ApplicationStatus.submitted) {
      const tokenHash = crypto.createHash('sha256').update(PRESIDENT_TOKEN).digest('hex');
      await prisma.magicToken.create({ data: { token: PRESIDENT_TOKEN, tokenHash, purpose: TokenPurpose.president_review, applicationId: application.id, recipientEmail: assoc.presidentEmail, expiresAt: daysFromNow(14) } });
      await prisma.notificationLog.create({ data: { applicationId: application.id, recipientEmail: assoc.presidentEmail, notificationType: NotificationType.president_review_request, providerMessageId: `seed-pres-${referenceNumber}`, sentAt: ts.submittedAt ?? now } });
      livePresidentTokenUrl = `${WEB_URL}/endorse/${PRESIDENT_TOKEN}`;
    }
  }

  // A FAILED notification on the endorsed app (test admin retry flow)
  const endorsedApp = await prisma.application.findFirst({ where: { status: ApplicationStatus.endorsed } });
  if (endorsedApp) {
    await prisma.notificationLog.create({ data: { applicationId: endorsedApp.id, recipientEmail: endorsedApp.email, notificationType: NotificationType.endorsed, failedAt: daysAgo(29), errorMessage: 'SMTP 550: mailbox unavailable (seeded failure for retry testing)' } });
    console.log('✓ Seeded 1 FAILED notification (retry it from the admin dashboard)');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('✅ Dev seed complete.');
  console.log('   Applications by status:', Object.entries(statusTally).map(([s, c]) => `${s}=${c}`).join(', '));
  console.log(`   Officer login password: ${DEFAULT_PASSWORD}`);
  console.log('   Admin: admin@fafics.org · Secretary: secretary@fafics.org · Committee: committee@fafics.org');
  if (livePresidentTokenUrl) {
    console.log('\n   🔗 Endorse the SUBMITTED application here (stable 14-day token):');
    console.log(`      ${livePresidentTokenUrl}`);
  }
  console.log('────────────────────────────────────────────────────────────');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error('Dev seed failed:', e); await prisma.$disconnect(); process.exit(1); });
