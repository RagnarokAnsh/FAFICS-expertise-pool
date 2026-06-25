import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../mail/notification.service';
import * as bcrypt from 'bcrypt';
import { addYears } from 'date-fns';
import {
  ApplicationStatus,
  NotificationType,
  UserRole,
} from '@fafics/shared';
import type {
  ApplicationSummary,
  ApplicationDetail,
  DashboardStats,
} from '@fafics/shared';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { AddNotesDto } from './dto/add-notes.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AnalyticsResponse } from './dto/analytics-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Applications ──────────────────────────────────────────────────────

  /**
   * List applications with pagination, filtering, and search.
   */
  async listApplications(
    dto: ListApplicationsDto,
  ): Promise<{ data: ApplicationSummary[]; total: number; page: number; limit: number }> {
    const { page, limit, status, country, search, areaKey } = dto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ApplicationWhereInput = {};

    if (status) {
      where.status = status as any;
    }

    if (country) {
      where.associationCountry = {
        contains: country,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { associationName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (areaKey) {
      where.expertise = {
        some: { areaKey },
      };
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          expertise: {
            where: { isPreferred: true },
            select: { areaLabel: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    const data: ApplicationSummary[] = applications.map((app) => ({
      id: app.id,
      referenceNumber: app.referenceNumber,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      associationName: app.associationName,
      associationCountry: app.associationCountry,
      status: app.status as ApplicationStatus,
      submittedAt: app.submittedAt?.toISOString() ?? null,
      endorsedAt: app.endorsedAt?.toISOString() ?? null,
      approvedAt: app.approvedAt?.toISOString() ?? null,
      expiresAt: app.expiresAt?.toISOString() ?? null,
      preferredAreas: app.expertise.map((e) => e.areaLabel),
    }));

    return { data, total, page, limit };
  }

  /**
   * Get full application detail with all relations and audit log.
   */
  async getApplicationDetail(id: string): Promise<ApplicationDetail> {
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

    return {
      id: app.id,
      referenceNumber: app.referenceNumber,
      uidNumber: app.uidNumber,
      status: app.status as ApplicationStatus,

      // Personal
      firstName: app.firstName,
      middleName: app.middleName,
      lastName: app.lastName,
      dateOfBirth: app.dateOfBirth ? app.dateOfBirth.toISOString().split('T')[0] : '',
      nationality: app.nationality,
      secondNationality: app.secondNationality,
      gender: app.gender,
      phone: app.phone,
      whatsapp: app.whatsapp,
      email: app.email,
      separationDate: app.separationDate ? app.separationDate.toISOString().split('T')[0] : '',

      // Association
      associationName: app.associationName,
      associationCountry: app.associationCountry,
      associationGeneralEmail: app.associationGeneralEmail,
      presidentEmail: app.presidentEmail,
      presidentPhone: app.presidentPhone,
      associateMemberName: app.associateMemberName,
      associateMemberCountry: app.associateMemberCountry,

      // Experience summaries
      unExperienceSummary: app.unExperienceSummary,
      nonUnExperienceSummary: app.nonUnExperienceSummary,
      faficsExperienceSummary: app.faficsExperienceSummary,
      localExperienceSummary: app.localExperienceSummary,

      // Position / committee preference
      preferredCommittees: app.preferredCommittees,
      preferredCommitteesOther: app.preferredCommitteesOther,
      positionPreferenceRationale: app.positionPreferenceRationale,

      // Core competencies
      competencies: app.competencies,

      // Review notes
      presidentNotes: app.presidentNotes,
      secretaryNotes: app.secretaryNotes,

      // Consent
      consentData: app.consentData,
      consentAccurate: app.consentAccurate,
      consentedAt: app.consentedAt?.toISOString() ?? null,

      // Timestamps
      submittedAt: app.submittedAt?.toISOString() ?? null,
      endorsedAt: app.endorsedAt?.toISOString() ?? null,
      approvedAt: app.approvedAt?.toISOString() ?? null,
      rejectedAt: app.rejectedAt?.toISOString() ?? null,
      expiresAt: app.expiresAt?.toISOString() ?? null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),

      // Relations
      educations: app.educations.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        degreeName: e.degreeName,
        institution: e.institution,
      })),
      languages: app.languages.map((l) => ({
        id: l.id,
        sortOrder: l.sortOrder,
        language: l.language,
        proficiency: l.proficiency as string,
      })),
      unExperiences: app.unExperiences.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        agency: e.agency,
        positionTitle: e.positionTitle,
        grade: e.grade,
        areaOfExpertise: e.areaOfExpertise,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      nonUnExperiences: app.nonUnExperiences.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        organization: e.organization,
        positionTitle: e.positionTitle,
        areaOfExpertise: e.areaOfExpertise,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      faficsExperiences: app.faficsExperiences.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        positionHeld: e.positionHeld,
        areaOfContribution: e.areaOfContribution,
        areaOfContributionOther: e.areaOfContributionOther,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      localExperiences: app.localExperiences.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        positionHeld: e.positionHeld,
        areaOfContribution: e.areaOfContribution,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      expertise: app.expertise.map((e) => ({
        id: e.id,
        sortOrder: e.sortOrder,
        areaKey: e.areaKey,
        areaLabel: e.areaLabel,
        expertiseLevel: e.expertiseLevel as string | null,
        isPreferred: e.isPreferred,
        isCustom: e.isCustom,
        customIndex: e.customIndex,
        otherDescription: e.otherDescription,
      })),
      auditLogs: app.auditLogs
        // Hide per-save draft noise from older records. New drafts no longer
        // write these rows, but existing databases may have many of them.
        .filter((log) => log.action !== 'application.draft_saved')
        .map((log) => ({
          id: log.id,
          action: log.action,
          actorEmail: log.actorEmail,
          actorRole: log.actorRole as string,
          oldStatus: log.oldStatus as string | null,
          newStatus: log.newStatus as string | null,
          metadata: log.metadata as Record<string, unknown> | null,
          createdAt: log.createdAt.toISOString(),
        })),
    };
  }

  // ─── Status Actions ────────────────────────────────────────────────────

  /**
   * Approve an endorsed application.
   * Sets status=approved, expiresAt=+3 years, queues approved email.
   */
  async approve(id: string, dto: ApproveDto, actorEmail: string): Promise<void> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    if (app.status !== 'endorsed' && app.status !== 'under_review') {
      throw new BadRequestException(
        `Cannot approve application with status '${app.status}'. Must be 'endorsed' or 'under_review'.`,
      );
    }

    const oldStatus = app.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          expiresAt: addYears(new Date(), 3),
          secretaryNotes: dto.secretaryNotes ?? app.secretaryNotes,
        },
      });

      await this.auditService.log({
        applicationId: id,
        actorEmail,
        actorRole: UserRole.SECRETARY,
        action: 'application.approved',
        oldStatus: oldStatus as any,
        newStatus: 'approved' as any,
      });
    });

    await this.notificationService.sendEmail(NotificationType.APPROVED, id);

    this.logger.log(`Application ${id} approved by ${actorEmail}`);
  }

  /**
   * Reject an application.
   * Sets status=rejected, queues rejected email.
   */
  async reject(id: string, dto: RejectDto, actorEmail: string): Promise<void> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    if (app.status === 'rejected' || app.status === 'expired') {
      throw new BadRequestException(
        `Cannot reject application with status '${app.status}'.`,
      );
    }

    const oldStatus = app.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          secretaryNotes: dto.secretaryNotes,
        },
      });

      await this.auditService.log({
        applicationId: id,
        actorEmail,
        actorRole: UserRole.SECRETARY,
        action: 'application.rejected',
        oldStatus: oldStatus as any,
        newStatus: 'rejected' as any,
      });
    });

    await this.notificationService.sendEmail(NotificationType.REJECTED, id);

    this.logger.log(`Application ${id} rejected by ${actorEmail}`);
  }

  /**
   * Request changes on an application.
   * Sets status=changes_requested, queues notification email.
   */
  async requestChanges(
    id: string,
    dto: RequestChangesDto,
    actorEmail: string,
  ): Promise<void> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    const oldStatus = app.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: 'changes_requested',
          secretaryNotes: dto.secretaryNotes,
        },
      });

      await this.auditService.log({
        applicationId: id,
        actorEmail,
        actorRole: UserRole.SECRETARY,
        action: 'application.changes_requested',
        oldStatus: oldStatus as any,
        newStatus: 'changes_requested' as any,
      });
    });

    await this.notificationService.sendEmail(NotificationType.CHANGES_REQUESTED, id);

    this.logger.log(`Changes requested on application ${id} by ${actorEmail}`);
  }

  /**
   * Add internal notes without changing status.
   */
  async addNotes(id: string, dto: AddNotesDto, actorEmail: string): Promise<void> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    await this.prisma.application.update({
      where: { id },
      data: { secretaryNotes: dto.secretaryNotes },
    });

    await this.auditService.log({
      applicationId: id,
      actorEmail,
      actorRole: UserRole.SECRETARY,
      action: 'secretary.notes_added',
    });

    this.logger.log(`Notes added to application ${id} by ${actorEmail}`);
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────

  /**
   * Returns dashboard statistics from vw_dashboard_stats.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const result = await this.prisma.$queryRaw<any[]>`SELECT * FROM vw_dashboard_stats`;

    if (!result || result.length === 0) {
      return {
        pendingEndorsement: 0,
        pendingReview: 0,
        underReview: 0,
        activeInPool: 0,
        changesRequested: 0,
        rejected: 0,
        expired: 0,
        drafts: 0,
        expiringIn90Days: 0,
      };
    }

    const stats = result[0];
    return {
      pendingEndorsement: Number(stats.pending_endorsement ?? stats.pendingEndorsement ?? 0),
      pendingReview: Number(stats.pending_review ?? stats.pendingReview ?? 0),
      underReview: Number(stats.under_review ?? stats.underReview ?? 0),
      activeInPool: Number(stats.active_in_pool ?? stats.activeInPool ?? 0),
      changesRequested: Number(stats.changes_requested ?? stats.changesRequested ?? 0),
      rejected: Number(stats.rejected ?? 0),
      expired: Number(stats.expired ?? 0),
      drafts: Number(stats.drafts ?? 0),
      expiringIn90Days: Number(stats.expiring_in_90_days ?? stats.expiringIn90Days ?? 0),
    };
  }

  // ─── Expiring Profiles ─────────────────────────────────────────────────

  /**
   * Returns approved applications expiring within the given number of days.
   */
  async getExpiring(days: number = 90): Promise<ApplicationSummary[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const applications = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gte: now,
          lte: future,
        },
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        expertise: {
          where: { isPreferred: true },
          select: { areaLabel: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return applications.map((app) => ({
      id: app.id,
      referenceNumber: app.referenceNumber,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      associationName: app.associationName,
      associationCountry: app.associationCountry,
      status: app.status as ApplicationStatus,
      submittedAt: app.submittedAt?.toISOString() ?? null,
      endorsedAt: app.endorsedAt?.toISOString() ?? null,
      approvedAt: app.approvedAt?.toISOString() ?? null,
      expiresAt: app.expiresAt?.toISOString() ?? null,
      preferredAreas: app.expertise.map((e) => e.areaLabel),
    }));
  }

  /**
   * Bulk send renewal reminder emails for specified application IDs.
   */
  async sendRenewalReminders(applicationIds: string[]): Promise<{ sent: number }> {
    for (const id of applicationIds) {
      await this.notificationService.sendEmail(NotificationType.RENEWAL_REMINDER_90D, id, 90);
    }
    return { sent: applicationIds.length };
  }

  async listNotifications(filters: {
    applicationId?: string;
    failedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    return this.notificationService.listNotifications(filters);
  }

  async retryNotification(logId: string) {
    return this.notificationService.retryNotification(logId);
  }

  // ─── User Management ──────────────────────────────────────────────────

  /**
   * Create a new officer user (admin only).
   */
  async createUser(dto: CreateUserDto, actorEmail: string): Promise<{ id: string }> {
    // Check for existing user
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role as any,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorEmail,
      actorRole: UserRole.ADMIN,
      action: 'user.created',
      metadata: { createdUserId: user.id, createdUserEmail: user.email, role: dto.role },
    });

    this.logger.log(`User ${dto.email} created by ${actorEmail}`);
    return { id: user.id };
  }

  /**
   * List all officer users (non-member roles).
   */
  async listUsers(): Promise<
    { id: string; email: string; role: string; firstName: string; lastName: string; isActive: boolean; createdAt: string }[]
  > {
    const users = await this.prisma.user.findMany({
      where: {
        role: { not: 'member' as any },
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role as string,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /**
   * Update a user's role (admin only).
   */
  async updateUserRole(
    userId: string,
    role: string,
    actorEmail: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const oldRole = user.role;

    // Prevent removing the last active administrator — doing so would lock
    // everyone out of admin-only functions (user management, etc.).
    if (oldRole === 'admin' && role !== 'admin') {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'admin' as any, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'Cannot change the role of the last active administrator.',
        );
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });

    await this.auditService.log({
      actorEmail,
      actorRole: UserRole.ADMIN,
      action: 'user.role_changed',
      metadata: { userId, oldRole, newRole: role },
    });

    this.logger.log(`User ${userId} role changed from ${oldRole} to ${role} by ${actorEmail}`);
  }

  // ─── Distinct Filter Options ────────────────────────────────────────────

  /**
   * Returns distinct association countries from all applications for filter dropdowns.
   */
  async getDistinctCountries(): Promise<string[]> {
    const results = await this.prisma.application.findMany({
      where: {
        associationCountry: { not: '' },
      },
      select: { associationCountry: true },
      distinct: ['associationCountry'],
      orderBy: { associationCountry: 'asc' },
    });

    return results
      .map((r) => r.associationCountry)
      .filter((c): c is string => !!c);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────

  async getAnalytics(): Promise<AnalyticsResponse> {
    const [expertise, nationality, gender, language, grade] = await Promise.all([
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT ae.area_label AS label, COUNT(*) AS count
        FROM application_expertise ae
        JOIN applications a ON a.id = ae.application_id
        WHERE a.status = 'approved'::application_status
          AND ae.is_preferred = true
        GROUP BY ae.area_label
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT nationality AS label, COUNT(*) AS count
        FROM applications
        WHERE status = 'approved'::application_status
        GROUP BY nationality
        ORDER BY count DESC
        LIMIT 15
      `,
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT gender AS label, COUNT(*) AS count
        FROM applications
        WHERE status = 'approved'::application_status
        GROUP BY gender
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT al.language AS label, COUNT(DISTINCT al.application_id) AS count
        FROM application_languages al
        JOIN applications a ON a.id = al.application_id
        WHERE a.status = 'approved'::application_status
        GROUP BY al.language
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT aue.grade AS label, COUNT(*) AS count
        FROM application_un_experiences aue
        JOIN applications a ON a.id = aue.application_id
        WHERE a.status = 'approved'::application_status
          AND aue.grade IS NOT NULL
          AND aue.grade <> ''
        GROUP BY aue.grade
        ORDER BY aue.grade
      `,
    ]);

    const toItems = (rows: { label: string; count: bigint }[]) =>
      rows.map((r) => ({ label: r.label, count: Number(r.count) }));

    return {
      expertiseDistribution: toItems(expertise),
      nationalityBreakdown: toItems(nationality),
      genderBalance: toItems(gender),
      languageCoverage: toItems(language),
      gradeDistribution: toItems(grade),
    };
  }
}
