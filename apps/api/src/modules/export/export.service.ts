import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

/** Labels the applicant saw in the form. */
const PROFICIENCY_LABELS: Record<string, string> = {
  mother_tongue: 'Mother tongue',
  proficient: 'Proficient',
  working_level: 'Working level',
  basic: 'Basic',
};
const LEVEL_LABELS: Record<string, string> = { average: 'Average', advanced: 'Advanced', expert: 'Expert' };
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting President',
  changes_requested: 'Returned for Changes',
  endorsed: 'Endorsed',
  under_review: 'Under Review',
  approved: 'Active in Pool',
  rejected: 'Rejected',
  expired: 'Expired',
};

/** Excel display format matching the app and emails: 22 Nov 2026. */
const DATE_FORMAT = 'd mmm yyyy';
const DATETIME_FORMAT = 'd mmm yyyy hh:mm';
/** Durations are stored in years; 99 is the "30+ years" choice. */
const YEARS_30_PLUS = 99;

const INCLUDE = {
  educations: { orderBy: { sortOrder: 'asc' } },
  languages: { orderBy: { sortOrder: 'asc' } },
  unExperiences: { orderBy: { sortOrder: 'asc' } },
  nonUnExperiences: { orderBy: { sortOrder: 'asc' } },
  faficsExperiences: { orderBy: { sortOrder: 'asc' } },
  localExperiences: { orderBy: { sortOrder: 'asc' } },
  expertise: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ApplicationInclude;

type FullApplication = Prisma.ApplicationGetPayload<{ include: typeof INCLUDE }>;
type CellValue = string | number | Date | null;

/** How a column is shown: plain text, a date, a long wrapped text, or years. */
interface Column {
  header: string;
  width: number;
  kind?: 'date' | 'datetime' | 'wrap' | 'years';
}

const hasText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The Expertise Pool (approved profiles) as an Excel workbook.
   *
   * Every sheet is a real Excel table: header filters, sorting, banded rows
   * that stay correct after sorting, frozen header, no merged cells. Dates
   * are real dates (sortable, filterable by year/month) shown as 22 Nov 2026.
   * Only filled-in information is listed — no empty rows or empty sheets.
   *
   * `ids` limits the export to those profiles (e.g. the filtered list on the
   * Expertise Pool page); without it, the whole pool is exported.
   */
  async generateRosterExcel(ids?: string[]): Promise<Buffer> {
    const apps = await this.prisma.application.findMany({
      where: { status: 'approved', ...(ids ? { id: { in: ids } } : {}) },
      include: INCLUDE,
    });
    apps.sort(
      (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );

    const workbook = this.newWorkbook('FAFICS Expertise Pool');
    const key = (app: FullApplication): CellValue[] => [app.referenceNumber, this.fullName(app)];

    // ── Members: one row per person, the columns people search on ────────
    this.addTableSheet(
      workbook,
      'Members',
      [
        { header: 'Reference No', width: 13 },
        { header: 'Name', width: 26 },
        { header: 'Email', width: 32 },
        { header: 'Phone', width: 19 },
        { header: 'Nationality', width: 16 },
        { header: 'Gender', width: 10 },
        { header: 'Association', width: 24 },
        { header: 'Association Country', width: 19 },
        { header: 'Languages', width: 36, kind: 'wrap' },
        { header: 'Expert Areas', width: 40, kind: 'wrap' },
        { header: 'Advanced Areas', width: 40, kind: 'wrap' },
        { header: 'Preferred Areas', width: 40, kind: 'wrap' },
        { header: 'Core Competencies', width: 40, kind: 'wrap' },
        { header: 'Preferred Committees', width: 40, kind: 'wrap' },
        { header: 'Approved', width: 13, kind: 'date' },
        { header: 'Expires', width: 13, kind: 'date' },
      ],
      apps.map((app) => [
        ...key(app),
        app.email,
        app.phone,
        app.nationality,
        app.gender,
        app.associationName,
        app.associationCountry,
        this.list(app.languages.filter((l) => hasText(l.language)).map((l) => `${l.language} (${this.proficiency(l.proficiency)})`)),
        this.list(app.expertise.filter((e) => e.expertiseLevel === 'expert').map(this.areaName)),
        this.list(app.expertise.filter((e) => e.expertiseLevel === 'advanced').map(this.areaName)),
        this.list(app.expertise.filter((e) => e.isPreferred).map(this.areaName)),
        this.list(app.competencies ?? []),
        this.list(this.withOther(app.preferredCommittees ?? [], app.preferredCommitteesOther)),
        app.approvedAt,
        app.expiresAt,
      ]),
      'No profiles are active in the Expertise Pool.',
    );

    this.addProfileSheets(workbook, apps);

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Expertise Pool Excel generated: ${apps.length} members`);
    return Buffer.from(buffer);
  }

  /**
   * Applications of any status, exactly as filtered and sorted on the
   * Applications page: an "Applications" sheet with where each one stands,
   * then the same Details, Statements and per-entry sheets as the pool export.
   */
  async generateApplicationsExcel(
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput[],
  ): Promise<Buffer> {
    const apps = await this.prisma.application.findMany({ where, orderBy, include: INCLUDE });
    const workbook = this.newWorkbook('FAFICS Expertise Pool — Applications');
    const now = Date.now();

    this.addTableSheet(
      workbook,
      'Applications',
      [
        { header: 'Reference No', width: 13 },
        { header: 'Name', width: 26 },
        { header: 'Status', width: 21 },
        { header: 'Email', width: 32 },
        { header: 'Phone', width: 19 },
        { header: 'Association', width: 24 },
        { header: 'Association Country', width: 19 },
        { header: 'President Email', width: 30 },
        { header: 'Submitted', width: 13, kind: 'date' },
        { header: 'Days Waiting', width: 13 },
        { header: 'Approved', width: 13, kind: 'date' },
        { header: 'Expires', width: 13, kind: 'date' },
        { header: 'Last Updated', width: 14, kind: 'date' },
      ],
      apps.map((app) => [
        app.referenceNumber,
        this.fullName(app),
        STATUS_LABELS[app.status] ?? app.status,
        app.email,
        app.phone,
        app.associationName,
        app.associationCountry,
        app.presidentEmail,
        app.submittedAt,
        // Only meaningful while the President has not acted.
        app.status === 'submitted' && app.submittedAt
          ? Math.floor((now - app.submittedAt.getTime()) / 86_400_000)
          : null,
        app.approvedAt,
        app.expiresAt,
        app.updatedAt,
      ]),
      'No applications match the filters.',
    );

    this.addProfileSheets(workbook, apps);

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Applications Excel generated: ${apps.length} applications`);
    return Buffer.from(buffer);
  }

  /** One application's full profile, with its history, for the officer view. */
  async generateSingleApplicationExcel(id: string): Promise<{ buffer: Buffer; referenceNumber: string | null }> {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { ...INCLUDE, auditLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const workbook = this.newWorkbook(`FAFICS Expertise Pool — ${app.referenceNumber ?? 'Draft'}`);

    // ── Profile: label / value pairs ──────────────────────────────────────
    const fields: [string, CellValue, Column['kind']?][] = [
      ['Reference No', app.referenceNumber],
      ['Status', STATUS_LABELS[app.status] ?? app.status],
      ['Name', this.fullName(app)],
      ['Email', app.email],
      ['Phone', app.phone],
      ['WhatsApp', app.whatsapp],
      ['Date of Birth', app.dateOfBirth, 'date'],
      ['Gender', app.gender],
      ['Nationality', app.nationality],
      ['Second Nationality', app.secondNationality],
      ['Separation Date', app.separationDate, 'date'],
      ['Association', app.associationName],
      ['Association Country', app.associationCountry],
      ['Association Email', app.associationGeneralEmail],
      ['President Email', app.presidentEmail],
      ['President Phone', app.presidentPhone],
      ['Other Association Country', app.associateMemberCountry],
      ['Core Competencies', this.list(app.competencies ?? [])],
      ['Preferred Committees', this.list(this.withOther(app.preferredCommittees ?? [], app.preferredCommitteesOther))],
      ['Why This Position / Committee', app.positionPreferenceRationale],
      ['UN Experience', app.unExperienceSummary],
      ['Non-UN Experience', app.nonUnExperienceSummary],
      ['FAFICS Experience', app.faficsExperienceSummary],
      ['Local Association Experience', app.localExperienceSummary],
      ["President's Comments", app.presidentNotes],
      ['Officer Notes', app.secretaryNotes],
      ['Submitted', app.submittedAt, 'date'],
      ['Approved', app.approvedAt, 'date'],
      ['Expires', app.expiresAt, 'date'],
      ['UID', app.uidNumber],
    ];
    const profile = workbook.addWorksheet('Profile');
    profile.columns = [
      { width: 28, style: { font: { bold: true }, alignment: { vertical: 'top' } } },
      { width: 70, style: { alignment: { vertical: 'top', wrapText: true } } },
    ];
    for (const [label, value, kind] of fields.filter(([, v]) => v instanceof Date || hasText(v))) {
      const row = profile.addRow([label, value]);
      if (kind === 'date') row.getCell(2).numFmt = DATE_FORMAT;
      row.getCell(2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    }

    this.addChildSheets(workbook, [app], false);

    // ── Timeline: what happened, when, by whom ("History" is reserved by Excel) ──
    this.addTableSheet(
      workbook,
      'Timeline',
      [
        { header: 'Date', width: 18, kind: 'datetime' },
        { header: 'Event', width: 40 },
        { header: 'By', width: 32 },
        { header: 'Status Change', width: 36 },
      ],
      app.auditLogs.map((log) => [
        log.createdAt,
        this.readableAction(log.action),
        log.actorEmail,
        log.oldStatus && log.newStatus
          ? `${STATUS_LABELS[log.oldStatus] ?? log.oldStatus} → ${STATUS_LABELS[log.newStatus] ?? log.newStatus}`
          : null,
      ]),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Single application Excel generated for ${app.referenceNumber || id}`);
    return { buffer: Buffer.from(buffer), referenceNumber: app.referenceNumber };
  }

  // ─── Sheets shared by both exports ─────────────────────────────────────

  /**
   * Details, Statements and the per-entry sheets (education, experience,
   * languages, expertise), with Reference No + Name in front of every row.
   * Shared by the pool export and the Applications export.
   */
  private addProfileSheets(workbook: ExcelJS.Workbook, apps: FullApplication[]): void {
    const key = (app: FullApplication): CellValue[] => [app.referenceNumber, this.fullName(app)];

    // ── Details: the remaining personal and association fields ───────────
    this.addTableSheet(
      workbook,
      'Details',
      [
        { header: 'Reference No', width: 13 },
        { header: 'Name', width: 26 },
        { header: 'Date of Birth', width: 13, kind: 'date' },
        { header: 'Second Nationality', width: 18 },
        { header: 'WhatsApp', width: 19 },
        { header: 'Separation Date', width: 15, kind: 'date' },
        { header: 'Association Email', width: 30 },
        { header: 'President Email', width: 30 },
        { header: 'President Phone', width: 19 },
        { header: 'Other Association Country', width: 22 },
        { header: 'Submitted', width: 13, kind: 'date' },
        { header: 'UID', width: 8 },
      ],
      apps.map((app) => [
        ...key(app),
        app.dateOfBirth,
        app.secondNationality,
        app.whatsapp,
        app.separationDate,
        app.associationGeneralEmail,
        app.presidentEmail,
        app.presidentPhone,
        app.associateMemberCountry,
        app.submittedAt,
        app.uidNumber,
      ]),
    );

    // ── Statements: the long written answers, wrapped ────────────────────
    this.addTableSheet(
      workbook,
      'Statements',
      [
        { header: 'Reference No', width: 13 },
        { header: 'Name', width: 26 },
        { header: 'UN Experience', width: 50, kind: 'wrap' },
        { header: 'Non-UN Experience', width: 50, kind: 'wrap' },
        { header: 'FAFICS Experience', width: 50, kind: 'wrap' },
        { header: 'Local Association Experience', width: 50, kind: 'wrap' },
        { header: 'Why This Position / Committee', width: 50, kind: 'wrap' },
      ],
      apps
        .map((app) => [
          ...key(app),
          app.unExperienceSummary,
          app.nonUnExperienceSummary,
          app.faficsExperienceSummary,
          app.localExperienceSummary,
          app.positionPreferenceRationale,
        ])
        .filter((row) => row.slice(2).some(hasText)),
    );

    this.addChildSheets(workbook, apps, true);
  }


  /**
   * Education, experience, languages and expertise, one row per entry.
   * `withMember` puts Reference No + Name in front (the pool export; a
   * single profile doesn't need them). Partly-filled leftovers from drafts
   * and unrated expertise areas are left out.
   */
  private addChildSheets(workbook: ExcelJS.Workbook, apps: FullApplication[], withMember: boolean): void {
    const keyCols: Column[] = withMember
      ? [{ header: 'Reference No', width: 13 }, { header: 'Name', width: 26 }]
      : [];
    const key = (app: FullApplication): CellValue[] =>
      withMember ? [app.referenceNumber, this.fullName(app)] : [];

    this.addTableSheet(
      workbook,
      'Education',
      [...keyCols, { header: 'Degree', width: 40, kind: 'wrap' }, { header: 'Institution', width: 40, kind: 'wrap' }],
      apps.flatMap((app) =>
        app.educations
          .filter((e) => hasText(e.degreeName) || hasText(e.institution))
          .map((e) => [...key(app), e.degreeName, e.institution]),
      ),
    );
    this.addTableSheet(
      workbook,
      'UN Experience',
      [
        ...keyCols,
        { header: 'Agency', width: 22 },
        { header: 'Position', width: 32, kind: 'wrap' },
        { header: 'Grade', width: 9 },
        { header: 'Area of Expertise', width: 30, kind: 'wrap' },
        { header: 'Years', width: 8, kind: 'years' },
      ],
      apps.flatMap((app) =>
        app.unExperiences
          .filter((e) => hasText(e.agency) || hasText(e.positionTitle))
          .map((e) => [...key(app), e.agency, e.positionTitle, e.grade, e.areaOfExpertise, this.years(e.durationYears)]),
      ),
    );
    this.addTableSheet(
      workbook,
      'Non-UN Experience',
      [
        ...keyCols,
        { header: 'Organization', width: 30, kind: 'wrap' },
        { header: 'Position', width: 32, kind: 'wrap' },
        { header: 'Area of Expertise', width: 30, kind: 'wrap' },
        { header: 'Years', width: 8, kind: 'years' },
      ],
      apps.flatMap((app) =>
        app.nonUnExperiences
          .filter((e) => hasText(e.organization) || hasText(e.positionTitle))
          .map((e) => [...key(app), e.organization, e.positionTitle, e.areaOfExpertise, this.years(e.durationYears)]),
      ),
    );
    this.addTableSheet(
      workbook,
      'FAFICS Experience',
      [
        ...keyCols,
        { header: 'Position Held', width: 32, kind: 'wrap' },
        { header: 'Area of Contribution', width: 45, kind: 'wrap' },
        { header: 'Years', width: 8, kind: 'years' },
      ],
      apps.flatMap((app) =>
        app.faficsExperiences
          .filter((e) => hasText(e.positionHeld))
          .map((e) => [
            ...key(app),
            e.positionHeld,
            this.list(this.withOther((e.areaOfContribution ?? '').split('; '), e.areaOfContributionOther)),
            this.years(e.durationYears),
          ]),
      ),
    );
    this.addTableSheet(
      workbook,
      'Local Experience',
      [
        ...keyCols,
        { header: 'Position Held', width: 32, kind: 'wrap' },
        { header: 'Area of Contribution', width: 45, kind: 'wrap' },
        { header: 'Years', width: 8, kind: 'years' },
      ],
      apps.flatMap((app) =>
        app.localExperiences
          .filter((e) => hasText(e.positionHeld))
          .map((e) => [...key(app), e.positionHeld, e.areaOfContribution, this.years(e.durationYears)]),
      ),
    );
    this.addTableSheet(
      workbook,
      'Languages',
      [...keyCols, { header: 'Language', width: 20 }, { header: 'Proficiency', width: 16 }],
      apps.flatMap((app) =>
        app.languages
          .filter((l) => hasText(l.language))
          .map((l) => [...key(app), l.language, this.proficiency(l.proficiency)]),
      ),
    );
    this.addTableSheet(
      workbook,
      'Expertise',
      [
        ...keyCols,
        { header: 'Area', width: 40, kind: 'wrap' },
        { header: 'Level', width: 11 },
        { header: 'Preferred', width: 11 },
      ],
      apps.flatMap((app) =>
        app.expertise
          // Only areas the applicant rated or chose as preferred.
          .filter((e) => e.expertiseLevel || e.isPreferred)
          .map((e) => [
            ...key(app),
            this.areaName(e),
            e.expertiseLevel ? LEVEL_LABELS[e.expertiseLevel] ?? e.expertiseLevel : null,
            e.isPreferred ? 'Yes' : 'No',
          ]),
      ),
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private newWorkbook(title: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FAFICS Expertise Pool';
    workbook.title = title;
    workbook.created = new Date();
    return workbook;
  }

  /**
   * Adds a sheet holding one Excel table. Skipped when there are no rows
   * (no empty sheets), unless `emptyMessage` asks for a sheet saying so.
   */
  private addTableSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    columns: Column[],
    rows: CellValue[][],
    emptyMessage?: string,
  ): void {
    if (rows.length === 0 && !emptyMessage) return;
    const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    if (rows.length === 0) {
      sheet.getCell('A1').value = emptyMessage;
      sheet.getColumn(1).width = 60;
      return;
    }

    sheet.addTable({
      name: sheetName.replace(/[^A-Za-z]/g, ''),
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: columns.map((c) => ({ name: c.header, filterButton: true })),
      rows: rows.map((row) => row.map((v) => (v === '' ? null : v))),
    });

    columns.forEach((c, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = c.width;
      column.eachCell((cell, rowNumber) => {
        cell.alignment = { vertical: 'top', wrapText: c.kind === 'wrap' || rowNumber === 1 };
        if (rowNumber === 1) return;
        if (c.kind === 'date') cell.numFmt = DATE_FORMAT;
        if (c.kind === 'datetime') cell.numFmt = DATETIME_FORMAT;
        if (c.kind === 'years') {
          cell.alignment = { vertical: 'top', horizontal: 'right' };
          // Sorts as the largest value but reads "30+".
          if (cell.value === YEARS_30_PLUS) cell.numFmt = '"30+"';
        }
      });
    });
    // Styled directly as well as by the table style, so the header reads the
    // same in Excel, LibreOffice and Google Sheets.
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    sheet.getRow(1).height = 30;
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' };
  }

  private fullName(app: { firstName: string; middleName: string | null; lastName: string }): string {
    return [app.firstName, app.middleName, app.lastName].filter(hasText).join(' ');
  }

  /** "a; b; c", or null when empty so the cell stays blank. */
  private list(values: string[]): string | null {
    const items = values.filter(hasText);
    return items.length ? items.join('; ') : null;
  }

  private proficiency(value: string): string {
    return PROFICIENCY_LABELS[value] ?? value;
  }

  private years(value: Prisma.Decimal | number | null): number | null {
    return value == null ? null : Number(value);
  }

  /** Custom ("Other") areas show what the applicant typed. */
  private readonly areaName = (e: { areaLabel: string; isCustom: boolean; otherDescription: string | null }): string =>
    e.isCustom && e.otherDescription ? e.otherDescription : e.areaLabel;

  /** Drops the literal "Other" choice and adds the text typed in its place. */
  private withOther(values: string[], other?: string | null): string[] {
    const cleaned = values.filter((v) => v && v !== 'Other');
    if (hasText(other)) cleaned.push(other);
    return cleaned;
  }

  /** "president.endorsed_and_approved" → "President endorsed and approved". */
  private readableAction(action: string): string {
    const text = action.replace(/[._]/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
