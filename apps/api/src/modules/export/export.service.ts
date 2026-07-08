import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the full FAFICS Expertise Pool data as an Excel workbook.
   * Queries vw_active_roster and formats with navy/gold styling.
   */
  async generateRosterExcel(): Promise<Buffer> {
    // Query the active roster view
    const rows = await this.prisma.$queryRaw<any[]>`SELECT * FROM vw_active_roster`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FAFICS Expertise Pool';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('FAFICS Expertise Pool Data');

    // ── Row 1: Title row ──────────────────────────────────────────────
    const today = format(new Date(), 'dd/MM/yyyy');
    sheet.mergeCells('A1:P1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `FAFICS Expertise Pool — Active Members — Generated: ${today}`;
    titleCell.font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: 'FFC8973A' }, // Gold
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D2240' }, // Navy
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // ── Row 2: Column headers ─────────────────────────────────────────
    const columns = [
      'Reference No', 'UID', 'First Name', 'Last Name', 'Gender',
      'Nationality', 'Email', 'Phone', 'Association', 'Country',
      'Separation Date', 'Approved Date', 'Expiry Date', 'Languages',
      'Preferred Areas', 'Expert-Level Areas',
    ];

    const headerRow = sheet.getRow(2);
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col;
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }, // White
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D2240' }, // Navy
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 24;

    // ── Rows 3+: Data rows ────────────────────────────────────────────
    rows.forEach((row, idx) => {
      const preferredAreas = this.parseArrayField(row.preferred_areas || row.preferredAreas);
      const languages = this.parseArrayField(row.languages);
      const expertAreas = this.parseArrayField(row.expert_areas || row.expertAreas);

      const dataRow = sheet.getRow(idx + 3);
      dataRow.values = [
        row.reference_number || row.referenceNumber || '',
        row.uid_number || row.uidNumber || '',
        row.first_name || row.firstName || '',
        row.last_name || row.lastName || '',
        row.gender || '',
        row.nationality || '',
        row.email || '',
        row.phone || '',
        row.association_name || row.associationName || '',
        row.association_country || row.associationCountry || '',
        this.formatDate(row.separation_date || row.separationDate),
        this.formatDate(row.approved_at || row.approvedAt),
        this.formatDate(row.expires_at || row.expiresAt),
        languages.join('; '),
        preferredAreas.join(', '),
        expertAreas.join('; '),
      ];

      // Alternating row colors for readability
      if (idx % 2 === 1) {
        for (let col = 1; col <= 16; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F7FA' },
          };
        }
      }

      // Add borders to data cells
      for (let col = 1; col <= 16; col++) {
        dataRow.getCell(col).border = {
          top: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          bottom: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          left: { style: 'thin', color: { argb: 'FFDDE3EF' } },
          right: { style: 'thin', color: { argb: 'FFDDE3EF' } },
        };
      }
    });

    // ── Auto-width columns ────────────────────────────────────────────
    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 4, 50);
    });

    // ── Freeze top 2 rows ─────────────────────────────────────────────
    sheet.views = [{ state: 'frozen', ySplit: 2 }];

    // ── Auto-filter on row 2 ──────────────────────────────────────────
    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: 16 },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Expertise Pool Excel generated: ${rows.length} rows`);
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
      ['President Email', app.presidentEmail],
      ['President Phone', app.presidentPhone],
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
      const eduHeaders = ['#', 'Degree', 'Institution'];
      this.addHeaderRow(eduSheet, 3, eduHeaders);
      app.educations.forEach((e, idx) => {
        eduSheet.getRow(idx + 4).values = [idx + 1, e.degreeName, e.institution];
      });
      this.autoWidthColumns(eduSheet);
    }

    // ── Languages Sheet ───────────────────────────────────────────────
    if (app.languages.length > 0) {
      const langSheet = workbook.addWorksheet('Languages');
      this.addSectionHeader(langSheet, 'Languages', 2);
      this.addHeaderRow(langSheet, 3, ['#', 'Language', 'Proficiency']);
      app.languages.forEach((l, idx) => {
        langSheet.getRow(idx + 4).values = [idx + 1, l.language, l.proficiency];
      });
      this.autoWidthColumns(langSheet);
    }

    // ── UN Experience Sheet ───────────────────────────────────────────
    if (app.unExperiences.length > 0) {
      const unSheet = workbook.addWorksheet('UN Experience');
      this.addSectionHeader(unSheet, 'UN Experience', 5);
      this.addHeaderRow(unSheet, 3, ['#', 'Agency', 'Position', 'Grade', 'Duration (yrs)']);
      app.unExperiences.forEach((e, idx) => {
        unSheet.getRow(idx + 4).values = [
          idx + 1, e.agency, e.positionTitle, e.grade || '', e.durationYears ? Number(e.durationYears) : '',
        ];
      });
      this.autoWidthColumns(unSheet);
    }

    // ── FAFICS Experience Sheet ───────────────────────────────────────
    if (app.faficsExperiences.length > 0) {
      const fxSheet = workbook.addWorksheet('FAFICS Experience');
      this.addSectionHeader(fxSheet, 'FAFICS Experience', 4);
      this.addHeaderRow(fxSheet, 3, ['#', 'Position Held', 'Area of Contribution', 'Duration (yrs)']);
      app.faficsExperiences.forEach((e, idx) => {
        const committees = (e.areaOfContribution || '')
          .split('; ')
          .filter((c) => c && c !== 'Other');
        if (e.areaOfContributionOther) committees.push(e.areaOfContributionOther);
        fxSheet.getRow(idx + 4).values = [
          idx + 1, e.positionHeld, committees.join('; '), e.durationYears ? Number(e.durationYears) : '',
        ];
      });
      this.autoWidthColumns(fxSheet);
    }

    // ── Expertise Sheet ───────────────────────────────────────────────
    if (app.expertise.length > 0) {
      const expSheet = workbook.addWorksheet('Expertise');
      this.addSectionHeader(expSheet, 'Expertise Assessment', 5);
      this.addHeaderRow(expSheet, 3, ['Area', 'Level', 'Preferred', 'Custom', 'Description']);
      app.expertise.forEach((e, idx) => {
        expSheet.getRow(idx + 4).values = [
          e.areaLabel, e.expertiseLevel || '', e.isPreferred ? 'Yes' : 'No',
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

  private parseArrayField(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Handle PostgreSQL array format: {a,b,c}
      if (value.startsWith('{') && value.endsWith('}')) {
        return value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/"/g, ''));
      }
      return value.split(',').map((s: string) => s.trim());
    }
    return [];
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
