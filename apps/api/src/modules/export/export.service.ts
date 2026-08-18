import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { formatDuration } from '../../common/utils/duration.util';

/** Mirrors the proficiency dropdown labels in Step 2 of the application form. */
const PROFICIENCY_LABELS: Record<string, string> = {
  mother_tongue: 'Mother tongue',
  proficient: 'Proficient',
  working_level: 'Working-level',
  basic: 'Basic',
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the full FAFICS Expertise Pool data as an Excel workbook.
   *
   * Sheet 1 ("Members") holds one row per approved application with every
   * scalar field from the application form. The one-to-many sections
   * (education, the four experience types, languages, expertise) each get
   * their own sheet, keyed by Reference No + Name so rows can be filtered or
   * pivoted back to a member. Only approved applications are included; the
   * consent fields and the audit trail are deliberately excluded.
   */
  async generateRosterExcel(): Promise<Buffer> {
    const apps = await this.prisma.application.findMany({
      where: { status: 'approved' },
      include: {
        educations: { orderBy: { sortOrder: 'asc' } },
        languages: { orderBy: { sortOrder: 'asc' } },
        unExperiences: { orderBy: { sortOrder: 'asc' } },
        nonUnExperiences: { orderBy: { sortOrder: 'asc' } },
        faficsExperiences: { orderBy: { sortOrder: 'asc' } },
        localExperiences: { orderBy: { sortOrder: 'asc' } },
        expertise: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { referenceNumber: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FAFICS Expertise Pool';
    workbook.created = new Date();

    const today = format(new Date(), 'dd/MM/yyyy');
    // Reference No + member name lead every child sheet so a row can always be
    // traced back to the Members sheet.
    const key = (app: (typeof apps)[number]) => [
      app.referenceNumber ?? '',
      `${app.firstName} ${app.lastName}`,
    ];
    const areaName = this.areaName;

    // ── Sheet 1: Members (one row per person) ─────────────────────────
    this.buildSheet(
      workbook,
      'Members',
      `FAFICS Expertise Pool — Active Members — Generated: ${today}`,
      [
        'Reference No', 'UID', 'First Name', 'Middle Name', 'Last Name',
        'Date of Birth', 'Gender', 'Nationality', 'Second Nationality',
        'Email', 'Phone', 'WhatsApp', 'Separation Date',
        'Association', 'Association Country', 'Association General Email',
        'President Email', 'President Phone',
        'Associate Member Name', 'Associate Member Country',
        'Core Competencies', 'Preferred Committees', 'Preference Rationale',
        'UN Experience Summary', 'Non-UN Experience Summary',
        'FAFICS Experience Summary', 'Local Experience Summary',
        'Languages', 'Preferred Areas', 'Expert-Level Areas',
        'Submitted Date', 'Endorsed Date', 'Approved Date', 'Expiry Date',
      ],
      apps.map((app) => [
        app.referenceNumber ?? '',
        app.uidNumber ?? '',
        app.firstName,
        app.middleName ?? '',
        app.lastName,
        this.formatDate(app.dateOfBirth),
        app.gender,
        app.nationality,
        app.secondNationality ?? '',
        app.email,
        app.phone,
        app.whatsapp ?? '',
        this.formatDate(app.separationDate),
        app.associationName,
        app.associationCountry,
        app.associationGeneralEmail ?? '',
        app.presidentEmail,
        app.presidentPhone,
        app.associateMemberName ?? '',
        app.associateMemberCountry ?? '',
        (app.competencies ?? []).join('; '),
        this.withOther(app.preferredCommittees ?? [], app.preferredCommitteesOther).join('; '),
        app.positionPreferenceRationale ?? '',
        app.unExperienceSummary ?? '',
        app.nonUnExperienceSummary ?? '',
        app.faficsExperienceSummary ?? '',
        app.localExperienceSummary ?? '',
        app.languages.map((l) => `${l.language} (${this.proficiencyLabel(l.proficiency)})`).join('; '),
        app.expertise.filter((e) => e.isPreferred).map(areaName).join('; '),
        app.expertise.filter((e) => e.expertiseLevel === 'expert').map(areaName).join('; '),
        this.formatDate(app.submittedAt),
        this.formatDate(app.endorsedAt),
        this.formatDate(app.approvedAt),
        this.formatDate(app.expiresAt),
      ]),
    );

    // ── Sheet 2: Education ────────────────────────────────────────────
    this.buildSheet(
      workbook,
      'Education',
      'Education',
      ['Reference No', 'Member', 'Degree', 'Institution'],
      apps.flatMap((app) =>
        app.educations.map((e) => [...key(app), e.degreeName, e.institution]),
      ),
    );

    // ── Sheet 3: UN Experience ────────────────────────────────────────
    this.buildSheet(
      workbook,
      'UN Experience',
      'UN Experience',
      ['Reference No', 'Member', 'Agency', 'Position', 'Grade', 'Area of Expertise', 'Duration'],
      apps.flatMap((app) =>
        app.unExperiences.map((e) => [
          ...key(app), e.agency, e.positionTitle,
          e.grade ?? '', e.areaOfExpertise ?? '', this.formatYears(e.durationYears),
        ]),
      ),
    );

    // ── Sheet 4: Non-UN Experience ────────────────────────────────────
    this.buildSheet(
      workbook,
      'Non-UN Experience',
      'Non-UN Experience',
      ['Reference No', 'Member', 'Organization', 'Position', 'Area of Expertise', 'Duration'],
      apps.flatMap((app) =>
        app.nonUnExperiences.map((e) => [
          ...key(app), e.organization, e.positionTitle,
          e.areaOfExpertise ?? '', this.formatYears(e.durationYears),
        ]),
      ),
    );

    // ── Sheet 5: FAFICS Experience ────────────────────────────────────
    this.buildSheet(
      workbook,
      'FAFICS Experience',
      'FAFICS Experience',
      ['Reference No', 'Member', 'Position Held', 'Area of Contribution', 'Duration'],
      apps.flatMap((app) =>
        app.faficsExperiences.map((e) => [
          ...key(app), e.positionHeld,
          this.withOther((e.areaOfContribution ?? '').split('; '), e.areaOfContributionOther).join('; '),
          this.formatYears(e.durationYears),
        ]),
      ),
    );

    // ── Sheet 6: Local Experience ─────────────────────────────────────
    this.buildSheet(
      workbook,
      'Local Experience',
      'Local Association Experience',
      ['Reference No', 'Member', 'Position Held', 'Area of Contribution', 'Duration'],
      apps.flatMap((app) =>
        app.localExperiences.map((e) => [
          ...key(app), e.positionHeld,
          e.areaOfContribution ?? '', this.formatYears(e.durationYears),
        ]),
      ),
    );

    // ── Sheet 7: Languages ────────────────────────────────────────────
    this.buildSheet(
      workbook,
      'Languages',
      'Languages',
      ['Reference No', 'Member', 'Language', 'Proficiency'],
      apps.flatMap((app) =>
        app.languages.map((l) => [
          ...key(app), l.language, this.proficiencyLabel(l.proficiency),
        ]),
      ),
    );

    // ── Sheet 8: Expertise assessment ─────────────────────────────────
    this.buildSheet(
      workbook,
      'Expertise',
      'Expertise Assessment',
      ['Reference No', 'Member', 'Area', 'Level', 'Preferred', 'Custom', 'Description'],
      apps.flatMap((app) =>
        app.expertise.map((e) => [
          ...key(app), areaName(e), e.expertiseLevel ?? '',
          e.isPreferred ? 'Yes' : 'No', e.isCustom ? 'Yes' : 'No', e.otherDescription ?? '',
        ]),
      ),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Expertise Pool Excel generated: ${apps.length} members across 8 sheets`);
    return Buffer.from(buffer);
  }

  /**
   * Generates an Excel file for a single application's full profile.
   */
  async generateSingleApplicationExcel(id: string): Promise<Buffer> {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        educations: { orderBy: { sortOrder: 'asc' } },
        languages: { orderBy: { sortOrder: 'asc' } },
        unExperiences: { orderBy: { sortOrder: 'asc' } },
        nonUnExperiences: { orderBy: { sortOrder: 'asc' } },
        faficsExperiences: { orderBy: { sortOrder: 'asc' } },
        localExperiences: { orderBy: { sortOrder: 'asc' } },
        expertise: { orderBy: { sortOrder: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FAFICS Expertise Pool';
    workbook.created = new Date();

    // ── Personal Info Sheet ───────────────────────────────────────────
    const personalSheet = workbook.addWorksheet('Personal Information');

    // Title row
    personalSheet.mergeCells('A1:D1');
    const pTitleCell = personalSheet.getCell('A1');
    pTitleCell.value = `FAFICS Expertise Pool — Application: ${app.referenceNumber || 'DRAFT'}`;
    pTitleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFC8973A' } };
    pTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
    pTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    personalSheet.getRow(1).height = 36;

    // Field headers styling
    const fieldHeaderStyle: Partial<ExcelJS.Style> = {
      font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    };

    const fieldValueStyle: Partial<ExcelJS.Style> = {
      font: { name: 'Calibri', size: 11 },
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    };

    // Personal fields
    const personalFields = [
      ['Status', app.status],
      ['Reference Number', app.referenceNumber || 'N/A'],
      ['UID Number', app.uidNumber || 'N/A'],
      ['First Name', app.firstName],
      ['Middle Name', app.middleName || ''],
      ['Last Name', app.lastName],
      ['Date of Birth', this.formatDate(app.dateOfBirth)],
      ['Nationality', app.nationality],
      ['Second Nationality', app.secondNationality || ''],
      ['Gender', app.gender],
      ['Phone', app.phone],
      ['WhatsApp', app.whatsapp || ''],
      ['Email', app.email],
      ['Separation Date', this.formatDate(app.separationDate)],
      ['Association', app.associationName],
      ['Association Country', app.associationCountry],
      ['Association General Email', app.associationGeneralEmail || ''],
      ['President Email', app.presidentEmail],
      ['President Phone', app.presidentPhone],
      ['Associate Member Name', app.associateMemberName || ''],
      ['Associate Member Country', app.associateMemberCountry || ''],
      ['Submitted At', app.submittedAt ? this.formatDate(app.submittedAt) : 'N/A'],
      ['Endorsed At', app.endorsedAt ? this.formatDate(app.endorsedAt) : 'N/A'],
      ['Approved At', app.approvedAt ? this.formatDate(app.approvedAt) : 'N/A'],
      ['Expires At', app.expiresAt ? this.formatDate(app.expiresAt) : 'N/A'],
      ['Core Competencies', app.competencies?.join('; ') || ''],
      ['Preferred Committees', [
        ...(app.preferredCommittees ?? []).filter((c) => c !== 'Other'),
        ...(app.preferredCommitteesOther ? [app.preferredCommitteesOther] : []),
      ].join('; ')],
      ['Preference Rationale', app.positionPreferenceRationale || ''],
      ['UN Experience Summary', app.unExperienceSummary || ''],
      ['Non-UN Experience Summary', app.nonUnExperienceSummary || ''],
      ['FAFICS Experience Summary', app.faficsExperienceSummary || ''],
      ['Local Experience Summary', app.localExperienceSummary || ''],
      ['President Notes', app.presidentNotes || ''],
      ['Secretary Notes', app.secretaryNotes || ''],
    ];

    personalFields.forEach(([label, value], idx) => {
      const row = personalSheet.getRow(idx + 3);
      const labelCell = row.getCell(1);
      labelCell.value = label;
      Object.assign(labelCell, { style: fieldHeaderStyle });

      const valueCell = row.getCell(2);
      valueCell.value = value;
      Object.assign(valueCell, { style: fieldValueStyle });
    });

    personalSheet.getColumn(1).width = 22;
    personalSheet.getColumn(2).width = 45;

    // ── Education Sheet ───────────────────────────────────────────────
    if (app.educations.length > 0) {
      const eduSheet = workbook.addWorksheet('Education');
      this.addSectionHeader(eduSheet, 'Education', 2);
      const eduHeaders = ['Degree', 'Institution'];
      this.addHeaderRow(eduSheet, 3, eduHeaders);
      app.educations.forEach((e, idx) => {
        eduSheet.getRow(idx + 4).values = [e.degreeName, e.institution];
      });
      this.autoWidthColumns(eduSheet);
    }

    // ── Languages Sheet ───────────────────────────────────────────────
    if (app.languages.length > 0) {
      const langSheet = workbook.addWorksheet('Languages');
      this.addSectionHeader(langSheet, 'Languages', 2);
      this.addHeaderRow(langSheet, 3, ['Language', 'Proficiency']);
      app.languages.forEach((l, idx) => {
        langSheet.getRow(idx + 4).values = [l.language, this.proficiencyLabel(l.proficiency)];
      });
      this.autoWidthColumns(langSheet);
    }

    // ── UN Experience Sheet ───────────────────────────────────────────
    if (app.unExperiences.length > 0) {
      const unSheet = workbook.addWorksheet('UN Experience');
      this.addSectionHeader(unSheet, 'UN Experience', 5);
      this.addHeaderRow(unSheet, 3, ['Agency', 'Position', 'Grade', 'Area of Expertise', 'Duration']);
      app.unExperiences.forEach((e, idx) => {
        unSheet.getRow(idx + 4).values = [
          e.agency, e.positionTitle, e.grade || '',
          e.areaOfExpertise || '', this.formatYears(e.durationYears),
        ];
      });
      this.autoWidthColumns(unSheet);
    }

    // ── Non-UN Experience Sheet ───────────────────────────────────────
    if (app.nonUnExperiences.length > 0) {
      const nonUnSheet = workbook.addWorksheet('Non-UN Experience');
      this.addSectionHeader(nonUnSheet, 'Non-UN Experience', 4);
      this.addHeaderRow(nonUnSheet, 3, ['Organization', 'Position', 'Area of Expertise', 'Duration']);
      app.nonUnExperiences.forEach((e, idx) => {
        nonUnSheet.getRow(idx + 4).values = [
          e.organization, e.positionTitle,
          e.areaOfExpertise || '', this.formatYears(e.durationYears),
        ];
      });
      this.autoWidthColumns(nonUnSheet);
    }

    // ── FAFICS Experience Sheet ───────────────────────────────────────
    if (app.faficsExperiences.length > 0) {
      const fxSheet = workbook.addWorksheet('FAFICS Experience');
      this.addSectionHeader(fxSheet, 'FAFICS Experience', 3);
      this.addHeaderRow(fxSheet, 3, ['Position Held', 'Area of Contribution', 'Duration']);
      app.faficsExperiences.forEach((e, idx) => {
        fxSheet.getRow(idx + 4).values = [
          e.positionHeld,
          this.withOther((e.areaOfContribution || '').split('; '), e.areaOfContributionOther).join('; '),
          this.formatYears(e.durationYears),
        ];
      });
      this.autoWidthColumns(fxSheet);
    }

    // ── Local Association Experience Sheet ────────────────────────────
    if (app.localExperiences.length > 0) {
      const localSheet = workbook.addWorksheet('Local Experience');
      this.addSectionHeader(localSheet, 'Local Association Experience', 3);
      this.addHeaderRow(localSheet, 3, ['Position Held', 'Area of Contribution', 'Duration']);
      app.localExperiences.forEach((e, idx) => {
        localSheet.getRow(idx + 4).values = [
          e.positionHeld, e.areaOfContribution || '', this.formatYears(e.durationYears),
        ];
      });
      this.autoWidthColumns(localSheet);
    }

    // ── Expertise Sheet ───────────────────────────────────────────────
    if (app.expertise.length > 0) {
      const expSheet = workbook.addWorksheet('Expertise');
      this.addSectionHeader(expSheet, 'Expertise Assessment', 5);
      this.addHeaderRow(expSheet, 3, ['Area', 'Level', 'Preferred', 'Custom', 'Description']);
      app.expertise.forEach((e, idx) => {
        expSheet.getRow(idx + 4).values = [
          this.areaName(e), e.expertiseLevel || '', e.isPreferred ? 'Yes' : 'No',
          e.isCustom ? 'Yes' : 'No', e.otherDescription || '',
        ];
      });
      this.autoWidthColumns(expSheet);
    }

    // ── Audit Log Sheet ───────────────────────────────────────────────
    if (app.auditLogs.length > 0) {
      const auditSheet = workbook.addWorksheet('Audit Log');
      this.addSectionHeader(auditSheet, 'Audit Trail', 5);
      this.addHeaderRow(auditSheet, 3, ['Date', 'Action', 'Actor', 'Role', 'Status Change']);
      app.auditLogs.forEach((log, idx) => {
        auditSheet.getRow(idx + 4).values = [
          this.formatDate(log.createdAt),
          log.action,
          log.actorEmail,
          log.actorRole,
          log.oldStatus && log.newStatus
            ? `${log.oldStatus} → ${log.newStatus}`
            : log.newStatus || '',
        ];
      });
      this.autoWidthColumns(auditSheet);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Single application Excel generated for ${app.referenceNumber || id}`);
    return Buffer.from(buffer);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private formatDate(value: any): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return format(d, 'dd/MM/yyyy');
  }

  /** Enum value → the label the applicant saw in the form's dropdown. */
  private proficiencyLabel(value: string): string {
    return PROFICIENCY_LABELS[value] ?? value;
  }

  /**
   * Custom ("Other") expertise rows carry the literal label "Other" — show what
   * the applicant actually typed instead. Bound as a field so it can be passed
   * straight to `.map()` without losing `this`.
   */
  private readonly areaName = (e: {
    areaLabel: string;
    isCustom: boolean;
    otherDescription: string | null;
  }): string => (e.isCustom && e.otherDescription ? e.otherDescription : e.areaLabel);

  /** Decimal(4,1) years → display string, mapping the 99.0 sentinel to "30+ years". */
  private formatYears(value: any): string {
    if (value == null) return '';
    return formatDuration(Number(value));
  }


  /**
   * Drops the literal "Other" placeholder from a multi-select and appends the
   * free-text value the applicant typed in its place.
   */
  private withOther(values: string[], other?: string | null): string[] {
    const cleaned = values.filter((v) => v && v !== 'Other');
    if (other) cleaned.push(other);
    return cleaned;
  }

  /**
   * Creates a styled worksheet: merged navy/gold title on row 1, header row on
   * row 2 (frozen + auto-filtered), data from row 3 with zebra striping.
   */
  private buildSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    title: string,
    headers: string[],
    rows: (string | number)[][],
  ): void {
    const sheet = workbook.addWorksheet(sheetName);

    sheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFC8973A' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    const headerRow = sheet.getRow(2);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 24;

    rows.forEach((values, idx) => {
      const dataRow = sheet.getRow(idx + 3);
      dataRow.values = values;

      for (let col = 1; col <= headers.length; col++) {
        const cell = dataRow.getCell(col);
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          bottom: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          left: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          right: { style: 'thin', color: { argb: 'FFDDE3EF' } },
        };
      }
    });

    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        // Ignore the merged title row — it would stretch column A to the full width.
        maxLength = Math.max(maxLength, Math.min(cellValue.length, 60));
      });
      column.width = Math.min(maxLength + 4, 50);
    });

    sheet.views = [{ state: 'frozen', ySplit: 2 }];
    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: headers.length },
    };
  }

  private addSectionHeader(sheet: ExcelJS.Worksheet, title: string, colSpan: number): void {
    sheet.mergeCells(1, 1, 1, colSpan);
    const cell = sheet.getCell('A1');
    cell.value = title;
    cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFC8973A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;
  }

  private addHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, headers: string[]): void {
    const row = sheet.getRow(rowNum);
    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2240' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    row.height = 22;
  }

  private autoWidthColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 4, 45);
    });
  }
}
