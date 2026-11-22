import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { EndorsementView, NotificationType, TokenPurpose } from '@fafics/shared';
import { EndorseDto } from './dto/endorse.dto';
import { ReturnDto } from './dto/return.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../mail/notification.service';
import { addYears } from 'date-fns';
import { APPLICATION_VIEW_INCLUDE, toEndorsementView } from '../applications/application-view.mapper';

@Injectable()
export class EndorsementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async validateAndGetApplication(rawToken: string): Promise<EndorsementView> {
    // Use peek() to validate without consuming the token.
    // The token is only consumed when the president actually endorses or returns.
    // Only president links open this page: an applicant's own edit or view link
    // is rejected here, so applicants cannot endorse their own application.
    const magicToken = await this.tokensService.peek(rawToken, TokenPurpose.PRESIDENT_REVIEW);

    const application = await this.prisma.application.findUnique({
      where: { id: magicToken.applicationId! },
      include: APPLICATION_VIEW_INCLUDE,
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Don't leak magicToken or internal fields beyond what's needed for the view
    return toEndorsementView(application);
  }

  async endorse(rawToken: string, dto: EndorseDto): Promise<{ message: string }> {
    const magicToken = await this.tokensService.validate(rawToken, TokenPurpose.PRESIDENT_REVIEW);

    const application = await this.prisma.application.findUnique({
      where: { id: magicToken.applicationId! },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== 'submitted') {
      throw new BadRequestException('Application is not in a valid state to be endorsed');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: {
          status: 'approved',
          endorsedAt: now,
          approvedAt: now,
          expiresAt: addYears(now, 3),
          presidentNotes: dto.presidentNotes || null,
        },
      });

      await this.auditService.log({
        applicationId: application.id,
        actorEmail: magicToken.recipientEmail,
        actorRole: 'president' as any,
        action: 'president.endorsed_and_approved',
        oldStatus: 'submitted' as any,
        newStatus: 'approved' as any,
      });
    });

    // Resends and reminders can leave several president links live; the
    // decision is made, so none of them should open the application again.
    await this.tokensService.invalidateForApplication(application.id, TokenPurpose.PRESIDENT_REVIEW);

    await this.notificationService.sendEmail(NotificationType.APPROVED, application.id);

    return { message: 'Application endorsed and added to Expertise Pool' };
  }

  async returnApplication(rawToken: string, dto: ReturnDto): Promise<{ message: string }> {
    const magicToken = await this.tokensService.validate(rawToken, TokenPurpose.PRESIDENT_REVIEW);

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

    await this.tokensService.invalidateForApplication(application.id, TokenPurpose.PRESIDENT_REVIEW);

    await this.notificationService.sendEmail(NotificationType.CHANGES_REQUESTED, application.id);

    return { message: 'Application returned for revision' };
  }
}
