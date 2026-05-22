import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationStatusQueryDto } from './dto/application-status-query.dto';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJobType, NotificationType } from '@fafics/shared';
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
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  /**
   * Creates a new application in draft status with all personal, association,
   * and child records in a single Prisma transaction.
   *
   * @param dto - Full application payload from the form
   * @returns Object containing the new application UUID
   */
  async createDraft(dto: CreateDraftDto): Promise<{ id: string }> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Create or find user for this applicant (applicants don't have accounts,
      // but we need a user row for the FK constraint)
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

      // Resolve association: use provided ID if valid, otherwise find by name or create new
      let assocId = dto.association.associationId || undefined;

      // If an associationId was provided, verify it actually exists
      if (assocId) {
        const existingById = await tx.association.findUnique({ where: { id: assocId } });
        if (!existingById) {
          this.logger.warn(`Provided associationId ${assocId} not found in DB — falling back to name lookup`);
          assocId = undefined;
        }
      }

      // Find by name or create new association
      if (!assocId) {
        const existingAssoc = await tx.association.findFirst({
          where: { name: { equals: dto.association.associationName ?? '', mode: 'insensitive' } },
        });
        if (existingAssoc) {
          assocId = existingAssoc.id;
          this.logger.log(`Matched existing association: ${existingAssoc.name} (${assocId})`);
        } else {
          const newAssoc = await tx.association.create({
            data: {
              name: dto.association.associationName ?? '',
              country: dto.association.associationCountry ?? '',
              email: dto.association.associationGeneralEmail || null,
            },
          });
          assocId = newAssoc.id;
          this.logger.log(`Created new association: ${dto.association.associationName} (${assocId})`);
        }
      }

      // Create the application with all personal + association fields flattened
      const application = await tx.application.create({
        data: {
          userId: user.id,
          associationId: assocId,
          status: 'draft',

          // Personal fields
          firstName: dto.personal.firstName ?? '',
          middleName: dto.personal.middleName,
          lastName: dto.personal.lastName ?? '',
          dateOfBirth: dto.personal.dateOfBirth ? new Date(dto.personal.dateOfBirth) : new Date(),
          nationality: dto.personal.nationality ?? '',
          secondNationality: dto.personal.secondNationality,
          gender: dto.personal.gender ?? '',
          phone: dto.personal.phone ?? '',
          whatsapp: dto.personal.whatsapp,
          email: dto.personal.email ?? '',
          separationDate: dto.personal.separationDate ? new Date(dto.personal.separationDate) : new Date(),

          // Association snapshot
          associationName: dto.association.associationName ?? '',
          associationCountry: dto.association.associationCountry ?? '',
          associationGeneralEmail: dto.association.associationGeneralEmail,
          presidentEmail: dto.association.presidentEmail ?? '',
          presidentPhone: dto.association.presidentPhone ?? '',
          associateMemberName: dto.association.associateMemberName,
          associateMemberCountry: dto.association.associateMemberCountry,

          // No child records or experience summaries are saved during Step 1 draft creation
        },
      });

      // Write audit log for draft creation
      await this.auditService.log({
        applicationId: application.id,
        actorEmail: dto.personal.email ?? '',
        actorRole: 'member',
        action: 'application.draft_saved',
        newStatus: 'draft',
      });

      return application;
    });

    this.logger.log(`Draft created: ${result.id}`);
    return { id: result.id };
  }

  /**
   * Updates an existing draft application. Replaces all child records
   * (deleteMany then createMany) inside a Prisma transaction.
   * Only allowed when status === 'draft'.
   *
   * @param id - Application UUID
   * @param dto - Partial application payload (only changed fields)
   */
  async updateDraft(id: string, dto: UpdateApplicationDto): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    if (application.status !== 'draft') {
      throw new BadRequestException(
        `Cannot update application with status '${application.status}'. Only drafts can be updated.`,
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

    // Write audit log outside the transaction to avoid connection pool deadlock
    await this.auditService.log({
      applicationId: id,
      actorEmail: application.email,
      actorRole: 'member',
      action: 'application.draft_saved',
    });

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
  ): Promise<{ referenceNumber: string }> {
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

    if (application.status !== 'draft') {
      throw new BadRequestException(
        `Cannot submit application with status '${application.status}'. Only drafts can be submitted.`,
      );
    }

    // Validate minimum required data
    if (!application.firstName || !application.lastName || !application.email) {
      throw new BadRequestException(
        'Personal information (first name, last name, email) is required.',
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

    // Execute the submission transaction
    const referenceNumber = await this.prisma.$transaction(async (tx) => {
      // Generate reference number via PostgreSQL function
      const refResult = await tx.$queryRaw<
        Array<{ fn_generate_reference_number: string }>
      >`SELECT fn_generate_reference_number() as fn_generate_reference_number`;

      // Generate UID via PostgreSQL function
      const uidResult = await tx.$queryRaw<
        Array<{ fn_generate_uid: string }>
      >`SELECT fn_generate_uid() as fn_generate_uid`;

      const refNumber = refResult[0].fn_generate_reference_number;
      const uidNumber = uidResult[0].fn_generate_uid;

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
          action: 'application.submitted',
          oldStatus: 'draft',
          newStatus: 'submitted',
        },
      });

      return refNumber;
    });

    // After transaction: queue the jobs
    try {
      await this.emailQueue.add(QueueJobType.SEND_PRESIDENT_LINK, {
        applicationId: id,
      });
      await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
        notificationType: NotificationType.SUBMISSION_CONFIRMATION,
        applicationId: id,
      });
    } catch (error) {
      this.logger.error(
        `Failed to queue send_president_link job for application ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(`Application submitted: ${id} → ${referenceNumber}`);
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
}
