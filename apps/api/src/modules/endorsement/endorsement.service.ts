import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { EndorsementView, QueueJobType, NotificationType } from '@fafics/shared';
import { EndorseDto } from './dto/endorse.dto';
import { ReturnDto } from './dto/return.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EndorsementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly auditService: AuditService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async validateAndGetApplication(rawToken: string): Promise<EndorsementView> {
    // Use peek() to validate without consuming the token.
    // The token is only consumed when the president actually endorses or returns.
    const magicToken = await this.tokensService.peek(rawToken);

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
      throw new BadRequestException('Application not found');
    }

    // Don't leak magicToken or internal fields beyond what's needed for the view
    return {
      referenceNumber: application.referenceNumber!,
      applicantFullName: `${application.firstName} ${application.lastName}`,
      email: application.email,
      nationality: application.nationality,
      secondNationality: application.secondNationality,
      gender: application.gender,
      phone: application.phone,
      dateOfBirth: application.dateOfBirth.toISOString().split('T')[0],
      separationDate: application.separationDate.toISOString().split('T')[0],
      associationName: application.associationName,
      associationCountry: application.associationCountry,
      educations: application.educations.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        degreeName: e.degreeName,
        institution: e.institution,
      })),
      languages: application.languages.map(l => ({
        id: l.id,
        sortOrder: l.sortOrder,
        language: l.language,
        proficiency: l.proficiency as any,
      })),
      unExperiences: application.unExperiences.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        agency: e.agency,
        positionTitle: e.positionTitle,
        grade: e.grade,
        areaOfExpertise: e.areaOfExpertise,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      nonUnExperiences: application.nonUnExperiences.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        organization: e.organization,
        positionTitle: e.positionTitle,
        areaOfExpertise: e.areaOfExpertise,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      faficsExperiences: application.faficsExperiences.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        positionHeld: e.positionHeld,
        areaOfContribution: e.areaOfContribution,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      localExperiences: application.localExperiences.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        positionHeld: e.positionHeld,
        areaOfContribution: e.areaOfContribution,
        durationYears: e.durationYears ? Number(e.durationYears) : null,
      })),
      expertise: application.expertise.map(e => ({
        id: e.id,
        sortOrder: e.sortOrder,
        customIndex: e.customIndex,
        areaKey: e.areaKey,
        areaLabel: e.areaLabel,
        expertiseLevel: e.expertiseLevel as any,
        isPreferred: e.isPreferred,
        isCustom: e.isCustom,
        otherDescription: e.otherDescription,
      })),
      unExperienceSummary: application.unExperienceSummary,
      nonUnExperienceSummary: application.nonUnExperienceSummary,
      faficsExperienceSummary: application.faficsExperienceSummary,
      localExperienceSummary: application.localExperienceSummary,
      submittedAt: application.submittedAt ? application.submittedAt.toISOString() : null,
    };
  }

  async endorse(rawToken: string, dto: EndorseDto): Promise<{ message: string }> {
    const magicToken = await this.tokensService.validate(rawToken);

    const application = await this.prisma.application.findUnique({
      where: { id: magicToken.applicationId! },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== 'submitted') {
      throw new BadRequestException('Application is not in a valid state to be endorsed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: {
          status: 'endorsed',
          endorsedAt: new Date(),
          presidentNotes: dto.presidentNotes || null,
        },
      });

      await this.auditService.log({
        applicationId: application.id,
        actorEmail: magicToken.recipientEmail,
        actorRole: 'president' as any,
        action: 'president.endorsed',
        oldStatus: 'submitted' as any,
        newStatus: 'endorsed' as any,
      });
    });

    await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
      notificationType: NotificationType.ENDORSED,
      applicationId: application.id,
    });

    await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
      notificationType: NotificationType.SECRETARY_REVIEW_PENDING,
      applicationId: application.id,
    });

    return { message: 'Application endorsed successfully' };
  }

  async returnApplication(rawToken: string, dto: ReturnDto): Promise<{ message: string }> {
    const magicToken = await this.tokensService.validate(rawToken);

    const application = await this.prisma.application.findUnique({
      where: { id: magicToken.applicationId! },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== 'submitted') {
      throw new BadRequestException('Application is not in a valid state to be returned');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: {
          status: 'changes_requested',
          presidentNotes: dto.presidentNotes,
        },
      });

      await this.auditService.log({
        applicationId: application.id,
        actorEmail: magicToken.recipientEmail,
        actorRole: 'president' as any,
        action: 'president.returned',
        oldStatus: 'submitted' as any,
        newStatus: 'changes_requested' as any,
      });
    });

    await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
      notificationType: NotificationType.CHANGES_REQUESTED,
      applicationId: application.id,
    });

    return { message: 'Application returned for revision' };
  }
}
