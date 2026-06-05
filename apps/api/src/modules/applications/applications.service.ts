import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  Logger,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationStatusQueryDto } from './dto/application-status-query.dto';
import { RequestEditLinkDto } from './dto/request-edit-link.dto';
import { Prisma } from '@prisma/client';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../mail/notification.service';
import { ConfigService } from '@nestjs/config';
import { TokenPurpose, NotificationType } from '@fafics/shared';
/**
 * ApplicationsService handles the core CRUD lifecycle of an application:
 * creating drafts, updating drafts, submitting, and checking status.
 *
 * All business logic lives here — the controller only delegates.
 */
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a new application in draft status with all personal, association,
   * and child records in a single Prisma transaction.
   *
   * @param dto - Full application payload from the form
   * @returns Object containing the new application UUID
   */
  async createDraft(
    dto: CreateDraftDto,
  ): Promise<{ id: string; editToken: string; resumed: boolean }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Create or find user for this applicant (applicants don't have accounts,
      // but we need a user row for the FK constraint). User is unique by email,
      // so this is the "individual" half of the dedup key.
      const user = await tx.user.upsert({
        where: { email: dto.personal.email ?? '' },
        update: {},
        create: {
          email: dto.personal.email ?? '',
          role: 'member',
          firstName: dto.personal.firstName ?? '',
          lastName: dto.personal.lastName ?? '',
        },
      });

      // Resolve association — the other half of the dedup key. Match on name +
      // country, both trimmed and case-insensitive, so the same real-world
      // association doesn't fork into multiple rows (a unique index on
      // lower(trim(name)), lower(trim(country)) backstops this).
      const assocName = (dto.association.associationName ?? '').trim();
      const assocCountry = (dto.association.associationCountry ?? '').trim();
      let assocId = dto.association.associationId || undefined;

      // If an associationId was provided, verify it actually exists
      if (assocId) {
        const existingById = await tx.association.findUnique({ where: { id: assocId } });
        if (!existingById) {
          this.logger.warn(`Provided associationId ${assocId} not found in DB — falling back to name lookup`);
          assocId = undefined;
        }
      }

      // Find by name + country or create new association
      if (!assocId) {
        const existingAssoc = await tx.association.findFirst({
          where: {
            name: { equals: assocName, mode: 'insensitive' },
            country: { equals: assocCountry, mode: 'insensitive' },
          },
        });
        if (existingAssoc) {
          assocId = existingAssoc.id;
          this.logger.log(`Matched existing association: ${existingAssoc.name} (${assocId})`);
        } else {
          const newAssoc = await tx.association.create({
            data: {
              name: assocName,
              country: assocCountry,
              email: dto.association.associationGeneralEmail || null,
            },
          });
          assocId = newAssoc.id;
          this.logger.log(`Created new association: ${assocName} (${assocId})`);
        }
      }

      // ── Deduplication: one ACTIVE application per individual + association ──
      // "Active" = anything not in a terminal state (rejected/expired). A fresh
      // record is only allowed once a previous cycle has terminated.
      const existing = await tx.application.findFirst({
        where: {
          userId: user.id,
          associationId: assocId,
          status: { notIn: ['rejected', 'expired'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Step-1 scalar fields shared by the create and resume paths.
      const step1Fields = {
        firstName: dto.personal.firstName ?? '',
        middleName: dto.personal.middleName,
        lastName: dto.personal.lastName ?? '',
        dateOfBirth: dto.personal.dateOfBirth ? new Date(dto.personal.dateOfBirth) : null,
        nationality: dto.personal.nationality ?? '',
        secondNationality: dto.personal.secondNationality,
        gender: dto.personal.gender ?? '',
        phone: dto.personal.phone ?? '',
        whatsapp: dto.personal.whatsapp,
        email: dto.personal.email ?? '',
        separationDate: dto.personal.separationDate ? new Date(dto.personal.separationDate) : null,
        associationName: assocName,
        associationCountry: assocCountry,
        associationGeneralEmail: dto.association.associationGeneralEmail,
        presidentEmail: dto.association.presidentEmail ?? '',
        presidentPhone: dto.association.presidentPhone ?? '',
        associateMemberName: dto.association.associateMemberName,
        associateMemberCountry: dto.association.associateMemberCountry,
      };

      if (existing) {
        const editable =
          existing.status === 'draft' || existing.status === 'changes_requested';
        if (!editable) {
          // submitted / endorsed / under_review / approved → don't duplicate.
          throw new ConflictException(
            `An application for this association already exists under ${step1Fields.email} ` +
              `(status: ${existing.status}). Please track or edit it from the status page.`,
          );
        }
        // Resume the existing editable record: refresh Step-1 fields only, leave
        // child records (education, experience, …) untouched.
        await tx.application.update({
          where: { id: existing.id },
          data: step1Fields,
        });
        return { application: existing, resumed: true };
      }

      // No active record → create a new draft.
      const application = await tx.application.create({
        data: {
          userId: user.id,
          associationId: assocId,
          status: 'draft',
          ...step1Fields,
          // No child records or experience summaries are saved during Step 1 draft creation
        },
      });

      // Write a single audit entry when the application is first started.
      // Subsequent auto-saves (updateDraft) intentionally do NOT write audit
      // rows — they would flood the timeline with one entry every ~30s.
      await this.auditService.log({
        applicationId: application.id,
        actorEmail: dto.personal.email ?? '',
        actorRole: 'member',
        action: 'application.draft_created',
        newStatus: 'draft',
      });

      return { application, resumed: false };
    });

    const { application, resumed } = result;
    this.logger.log(`Draft ${resumed ? 'resumed' : 'created'}: ${application.id}`);

    // Generate the applicant edit token up front. It is the ownership credential
    // for this draft: the browser keeps it and must present it on every
    // updateDraft/submit call (see assertEditToken), and the same token backs the
    // emailed resume link below. This prevents anyone who merely guesses the
    // application UUID from overwriting or submitting someone else's draft.
    const { rawToken: editToken } = await this.tokensService.generate({
      purpose: TokenPurpose.APPLICANT_EDIT,
      applicationId: application.id,
      recipientEmail: application.email,
      ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Email the resume link only for genuinely new drafts — a resume re-entry is
    // redirected straight into the form, so a duplicate email would be noise.
    if (!resumed) {
      void this.notificationService.sendDraftResumeLink(application.id, editToken);
    }

    return { id: application.id, editToken, resumed };
  }

  /**
   * Verifies that the caller holds a valid applicant edit token bound to this
   * application. Throws if the token is missing, invalid, expired, or scoped to
   * a different application. This is the object-level authorization check for
   * the otherwise-public draft write/submit endpoints.
   */
  private async assertEditToken(
    applicationId: string,
    rawToken?: string,
  ): Promise<void> {
    if (!rawToken) {
      throw new UnauthorizedException(
        'A valid edit link is required to modify this application.',
      );
    }

    // validate(..., false) checks existence + expiry without consuming the token,
    // so it can be reused across many auto-saves. Throws NotFound/Gone otherwise.
    const magicToken = await this.tokensService.validate(rawToken, false);

    if (
      (magicToken.purpose as string) !== TokenPurpose.APPLICANT_EDIT ||
      magicToken.applicationId !== applicationId
    ) {
      throw new ForbiddenException(
        'This edit link is not valid for this application.',
      );
    }
  }

  /**
   * Updates an existing draft application. Replaces all child records
   * (deleteMany then createMany) inside a Prisma transaction.
   * Only allowed when status === 'draft'.
   *
   * @param id - Application UUID
   * @param dto - Partial application payload (only changed fields)
   */
  async updateDraft(
    id: string,
    dto: UpdateApplicationDto,
    editToken?: string,
  ): Promise<void> {
    await this.assertEditToken(id, editToken);

    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // Editable states: a fresh draft, or an application a reviewer sent back
    // for revision (changes_requested). Anything past that is locked.
    if (application.status !== 'draft' && application.status !== 'changes_requested') {
      throw new BadRequestException(
        `Cannot update application with status '${application.status}'. Only drafts or applications returned for changes can be edited.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Build the update data object from provided fields
      const updateData: Prisma.ApplicationUpdateInput = {};

      // Personal fields
      if (dto.personal) {
        if (dto.personal.firstName !== undefined) updateData.firstName = dto.personal.firstName;
        if (dto.personal.middleName !== undefined) updateData.middleName = dto.personal.middleName;
        if (dto.personal.lastName !== undefined) updateData.lastName = dto.personal.lastName;
        if (dto.personal.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dto.personal.dateOfBirth);
        if (dto.personal.nationality !== undefined) updateData.nationality = dto.personal.nationality;
        if (dto.personal.secondNationality !== undefined) updateData.secondNationality = dto.personal.secondNationality;
        if (dto.personal.gender !== undefined) updateData.gender = dto.personal.gender;
        if (dto.personal.phone !== undefined) updateData.phone = dto.personal.phone;
        if (dto.personal.whatsapp !== undefined) updateData.whatsapp = dto.personal.whatsapp;
        if (dto.personal.email !== undefined) updateData.email = dto.personal.email;
        if (dto.personal.separationDate !== undefined) updateData.separationDate = new Date(dto.personal.separationDate);
      }

      // Association fields
      if (dto.association) {
        if (dto.association.associationId !== undefined) {
          updateData.association = { connect: { id: dto.association.associationId } };
        }
        if (dto.association.associationName !== undefined) updateData.associationName = dto.association.associationName;
        if (dto.association.associationCountry !== undefined) updateData.associationCountry = dto.association.associationCountry;
        if (dto.association.associationGeneralEmail !== undefined) updateData.associationGeneralEmail = dto.association.associationGeneralEmail;
        if (dto.association.presidentEmail !== undefined) updateData.presidentEmail = dto.association.presidentEmail;
        if (dto.association.presidentPhone !== undefined) updateData.presidentPhone = dto.association.presidentPhone;
        if (dto.association.associateMemberName !== undefined) updateData.associateMemberName = dto.association.associateMemberName;
        if (dto.association.associateMemberCountry !== undefined) updateData.associateMemberCountry = dto.association.associateMemberCountry;
      }

      // Experience summaries
      if (dto.unExperienceSummary !== undefined) updateData.unExperienceSummary = dto.unExperienceSummary;
      if (dto.nonUnExperienceSummary !== undefined) updateData.nonUnExperienceSummary = dto.nonUnExperienceSummary;
      if (dto.faficsExperienceSummary !== undefined) updateData.faficsExperienceSummary = dto.faficsExperienceSummary;
      if (dto.localExperienceSummary !== undefined) updateData.localExperienceSummary = dto.localExperienceSummary;

      // Update the application row
      await tx.application.update({ where: { id }, data: updateData });

      // Replace child records: deleteMany then createMany for each provided array
      if (dto.educations) {
        await tx.applicationEducation.deleteMany({ where: { applicationId: id } });
        await tx.applicationEducation.createMany({
          data: dto.educations.map((e, i) => ({
            applicationId: id,
            degreeName: e.degreeName ?? '',
            institution: e.institution ?? '',
            sortOrder: e.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.languages) {
        await tx.applicationLanguage.deleteMany({ where: { applicationId: id } });
        await tx.applicationLanguage.createMany({
          data: dto.languages.map((l, i) => ({
            applicationId: id,
            language: l.language ?? '',
            proficiency: l.proficiency ?? ('basic' as any), // Fallback proficiency
            sortOrder: l.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.unExperiences) {
        await tx.applicationUnExperience.deleteMany({ where: { applicationId: id } });
        await tx.applicationUnExperience.createMany({
          data: dto.unExperiences.map((u, i) => ({
            applicationId: id,
            agency: u.agency ?? '',
            positionTitle: u.positionTitle ?? '',
            grade: u.grade ?? '',
            areaOfExpertise: u.areaOfExpertise ?? '',
            durationYears: u.durationYears != null ? new Prisma.Decimal(u.durationYears) : null,
            sortOrder: u.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.nonUnExperiences) {
        await tx.applicationNonUnExperience.deleteMany({ where: { applicationId: id } });
        await tx.applicationNonUnExperience.createMany({
          data: dto.nonUnExperiences.map((n, i) => ({
            applicationId: id,
            organization: n.organization ?? '',
            positionTitle: n.positionTitle ?? '',
            areaOfExpertise: n.areaOfExpertise ?? '',
            durationYears: n.durationYears != null ? new Prisma.Decimal(n.durationYears) : null,
            sortOrder: n.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.faficsExperiences) {
        await tx.applicationFaficsExperience.deleteMany({ where: { applicationId: id } });
        await tx.applicationFaficsExperience.createMany({
          data: dto.faficsExperiences.map((f, i) => ({
            applicationId: id,
            positionHeld: f.positionHeld ?? '',
            areaOfContribution: f.areaOfContribution ?? '',
            durationYears: f.durationYears != null ? new Prisma.Decimal(f.durationYears) : null,
            sortOrder: f.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.localExperiences) {
        await tx.applicationLocalExperience.deleteMany({ where: { applicationId: id } });
        await tx.applicationLocalExperience.createMany({
          data: dto.localExperiences.map((l, i) => ({
            applicationId: id,
            positionHeld: l.positionHeld ?? '',
            areaOfContribution: l.areaOfContribution ?? '',
            durationYears: l.durationYears != null ? new Prisma.Decimal(l.durationYears) : null,
            sortOrder: l.sortOrder ?? i + 1,
          })),
        });
      }

      if (dto.expertise) {
        await tx.applicationExpertise.deleteMany({ where: { applicationId: id } });
        await tx.applicationExpertise.createMany({
          data: dto.expertise.map((e, i) => ({
            applicationId: id,
            areaKey: e.areaKey ?? '',
            areaLabel: e.areaLabel ?? '',
            expertiseLevel: e.expertiseLevel ?? undefined,
            isPreferred: e.isPreferred ?? false,
            isCustom: e.isCustom ?? false,
            customIndex: e.customIndex,
            otherDescription: e.otherDescription,
            sortOrder: e.sortOrder ?? i + 1,
          })),
        });
      }

    });

    // NOTE: Draft auto-saves deliberately do not write an audit log row.
    // The frontend auto-saves every ~30s of inactivity, so logging each save
    // would spam the immutable audit trail (and the admin timeline) with
    // dozens of "draft saved" entries per application. Meaningful lifecycle
    // events (created, submitted, endorsed, approved, …) are still audited.

    this.logger.log(`Draft updated: ${id}`);
  }

  /**
   * Submits a draft application. Generates reference number and UID via
   * PostgreSQL functions, updates status to 'submitted', creates audit log,
   * and queues the president magic link email job.
   *
   * @param id - Application UUID
   * @param dto - Consent fields (both must be true)
   * @returns Object containing the generated reference number
   */
  async submitApplication(
    id: string,
    dto: SubmitApplicationDto,
    editToken?: string,
  ): Promise<{ referenceNumber: string }> {
    await this.assertEditToken(id, editToken);

    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        educations: true,
        languages: true,
        unExperiences: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // Submittable from a fresh draft, or as a resubmission after a reviewer
    // returned it for changes. Both routes funnel back to 'submitted'.
    if (application.status !== 'draft' && application.status !== 'changes_requested') {
      throw new BadRequestException(
        `Cannot submit application with status '${application.status}'. Only drafts or applications returned for changes can be submitted.`,
      );
    }

    // Validate minimum required data
    if (!application.firstName || !application.lastName || !application.email) {
      throw new BadRequestException(
        'Personal information (first name, last name, email) is required.',
      );
    }
    if (!application.dateOfBirth || !application.separationDate) {
      throw new BadRequestException(
        'Date of birth and separation date are required.',
      );
    }
    if (!application.presidentEmail || !application.presidentPhone) {
      throw new BadRequestException(
        'Association president email and phone are required.',
      );
    }
    if (application.educations.length === 0) {
      throw new BadRequestException(
        'At least one education entry is required.',
      );
    }
    if (application.languages.length === 0) {
      throw new BadRequestException(
        'At least one language entry is required.',
      );
    }
    if (application.unExperiences.length === 0) {
      throw new BadRequestException(
        'At least one UN experience entry is required.',
      );
    }

    const isResubmission = application.status === 'changes_requested';

    // Execute the submission transaction
    const referenceNumber = await this.prisma.$transaction(async (tx) => {
      // Reference number + UID are issued once, on the first submission, and
      // preserved across resubmissions. Only generate them when absent so a
      // returned-for-changes application keeps its original identifiers.
      let refNumber = application.referenceNumber;
      let uidNumber = application.uidNumber;

      if (!refNumber) {
        const refResult = await tx.$queryRaw<
          Array<{ fn_generate_reference_number: string }>
        >`SELECT fn_generate_reference_number() as fn_generate_reference_number`;
        refNumber = refResult[0].fn_generate_reference_number;
      }
      if (!uidNumber) {
        const uidResult = await tx.$queryRaw<
          Array<{ fn_generate_uid: string }>
        >`SELECT fn_generate_uid() as fn_generate_uid`;
        uidNumber = uidResult[0].fn_generate_uid;
      }

      // Update application with submission data
      await tx.application.update({
        where: { id },
        data: {
          referenceNumber: refNumber,
          uidNumber: uidNumber,
          status: 'submitted',
          submittedAt: new Date(),
          consentData: dto.consentData,
          consentAccurate: dto.consentAccurate,
          consentedAt: new Date(),
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          applicationId: id,
          actorEmail: application.email,
          actorRole: 'member',
          action: isResubmission ? 'application.resubmitted' : 'application.submitted',
          oldStatus: application.status as any,
          newStatus: 'submitted',
        },
      });

      return refNumber;
    });

    // After transaction: send notifications (non-blocking — NotificationService
    // handles its own errors). sendPresidentLink reissues a fresh president
    // magic link, which is exactly what a resubmission needs (the prior link was
    // consumed when the application was returned).
    void this.notificationService.sendPresidentLink(id);
    void this.notificationService.sendEmail(NotificationType.SUBMISSION_CONFIRMATION, id);

    this.logger.log(
      `Application ${isResubmission ? 'resubmitted' : 'submitted'}: ${id} → ${referenceNumber}`,
    );
    return { referenceNumber };
  }

  /**
   * Looks up an application by email + reference number and returns
   * only the status fields — no personal data exposed.
   *
   * @param query - Email and reference number from the applicant
   * @returns Status information object
   */
  async getStatus(query: ApplicationStatusQueryDto): Promise<{
    status: string;
    referenceNumber: string;
    submittedAt: Date | null;
    endorsedAt: Date | null;
    approvedAt: Date | null;
  }> {
    const application = await this.prisma.application.findFirst({
      where: {
        email: query.email,
        referenceNumber: query.referenceNumber,
      },
      select: {
        status: true,
        referenceNumber: true,
        submittedAt: true,
        endorsedAt: true,
        approvedAt: true,
      },
    });

    if (!application) {
      throw new NotFoundException(
        'Application not found. Please check your email and reference number.',
      );
    }

    return {
      status: application.status,
      referenceNumber: application.referenceNumber!,
      submittedAt: application.submittedAt,
      endorsedAt: application.endorsedAt,
      approvedAt: application.approvedAt,
    };
  }

  /**
   * Generates a new edit token and emails the applicant with a resume link.
   */
  async requestEditLink(dto: RequestEditLinkDto): Promise<{ message: string }> {
    // Always return the same generic message so the response cannot be used to
    // discover which email/reference combinations exist or are editable.
    const generic = {
      message:
        'If an editable application matches those details, an edit link has been sent to the email on file.',
    };

    const application = await this.prisma.application.findFirst({
      where: {
        email: dto.email,
        referenceNumber: dto.referenceNumber,
      },
    });

    if (!application) {
      return generic;
    }

    if (application.status !== 'draft' && application.status !== 'changes_requested') {
      return generic;
    }

    const { rawToken } = await this.tokensService.reissue({
      purpose: TokenPurpose.APPLICANT_EDIT,
      applicationId: application.id,
      recipientEmail: application.email,
      ttlMs: 3 * 60 * 60 * 1000, // 3 hours
    });

    const webBaseUrl = this.configService.get<string>('app.webBaseUrl') || this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    const resumeUrl = `${webBaseUrl}/apply/resume/${rawToken}`;

    await this.mailService.sendApplicantEditLink(application.id, resumeUrl);

    await this.prisma.notificationLog.create({
      data: {
        notificationType: NotificationType.APPLICANT_EDIT_LINK,
        recipientEmail: application.email,
        applicationId: application.id,
        sentAt: new Date(),
      },
    });

    await this.auditService.log({
      applicationId: application.id,
      actorEmail: application.email,
      actorRole: 'member',
      action: 'application.edit_link_sent',
    });

    return generic;
  }

  /**
   * Validates an edit token and retrieves the full application data.
   */
  async resumeFromToken(rawToken: string): Promise<any> {
    const magicToken = await this.tokensService.validate(rawToken, false);

    const application = await this.prisma.application.findUnique({
      where: { id: magicToken.applicationId! },
      include: {
        educations: { orderBy: { sortOrder: 'asc' } },
        languages: { orderBy: { sortOrder: 'asc' } },
        unExperiences: { orderBy: { sortOrder: 'asc' } },
        nonUnExperiences: { orderBy: { sortOrder: 'asc' } },
        faficsExperiences: { orderBy: { sortOrder: 'asc' } },
        localExperiences: { orderBy: { sortOrder: 'asc' } },
        expertise: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    if (application.status !== 'draft' && application.status !== 'changes_requested') {
      throw new BadRequestException('This application is no longer editable.');
    }

    await this.auditService.log({
      applicationId: application.id,
      actorEmail: application.email,
      actorRole: 'member',
      action: 'application.resume_link_used',
    });

    // Map flat Prisma fields back to the nested DTO structure expected by the frontend
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      nationality,
      secondNationality,
      gender,
      phone,
      whatsapp,
      email,
      separationDate,
      associationId,
      associationName,
      associationCountry,
      associationGeneralEmail,
      presidentEmail,
      presidentPhone,
      associateMemberName,
      associateMemberCountry,
      ...rest
    } = application;

    return {
      id: application.id,
      status: application.status,
      presidentNotes: application.presidentNotes,
      personal: {
        firstName,
        middleName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : undefined,
        nationality,
        secondNationality,
        gender,
        phone,
        whatsapp,
        email,
        separationDate: separationDate ? new Date(separationDate).toISOString().split('T')[0] : undefined,
      },
      association: {
        associationId,
        associationName,
        associationCountry,
        associationGeneralEmail,
        presidentEmail,
        presidentPhone,
        associateMemberName,
        associateMemberCountry,
      },
      educations: rest.educations,
      languages: rest.languages,
      unExperiences: rest.unExperiences,
      nonUnExperiences: rest.nonUnExperiences,
      faficsExperiences: rest.faficsExperiences,
      localExperiences: rest.localExperiences,
      expertise: rest.expertise,
      unExperienceSummary: rest.unExperienceSummary,
      nonUnExperienceSummary: rest.nonUnExperienceSummary,
      faficsExperienceSummary: rest.faficsExperienceSummary,
      localExperienceSummary: rest.localExperienceSummary,
    };
  }

  /**
   * Finds the most recent draft for the given email and sends a resume link.
   * Returns void silently if no draft exists (prevents email enumeration).
   */
  async requestDraftLink(email: string): Promise<void> {
    const application = await this.prisma.application.findFirst({
      where: { email, status: 'draft' },
      orderBy: { createdAt: 'desc' },
    });

    if (!application) {
      // Do not throw — silently return to prevent email enumeration
      return;
    }

    const { rawToken } = await this.tokensService.reissue({
      purpose: TokenPurpose.APPLICANT_EDIT,
      applicationId: application.id,
      recipientEmail: email,
      ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const webBaseUrl = this.configService.get<string>('app.webBaseUrl') || this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    const resumeUrl = `${webBaseUrl}/apply/resume/${rawToken}`;

    await this.mailService.sendDraftSavedEmail(application.id, resumeUrl);

    await this.auditService.log({
      applicationId: application.id,
      actorEmail: email,
      actorRole: 'member',
      action: 'application.draft_link_requested',
    });
  }
}
