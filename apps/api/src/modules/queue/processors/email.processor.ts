import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueJobType, NotificationType, TokenPurpose } from '@fafics/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokensService } from '../../tokens/tokens.service';
import { MailService } from '../../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case QueueJobType.SEND_PRESIDENT_LINK:
        return this.handleSendPresidentLink(job as Job<{ applicationId: string }>);
      case QueueJobType.SEND_EMAIL:
        return this.handleSendEmail(job as Job<{ notificationType: NotificationType; applicationId: string; daysLeft?: 90 | 30 }>);
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendPresidentLink(job: Job<{ applicationId: string }>): Promise<void> {
    const { applicationId } = job.data;
    
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const ttlMs = this.configService.get<number>('PRESIDENT_LINK_TTL_MS', 14 * 24 * 60 * 60 * 1000);
    const { rawToken } = await this.tokensService.reissue({
      applicationId,
      purpose: TokenPurpose.PRESIDENT_REVIEW,
      recipientEmail: application.presidentEmail,
      ttlMs,
    });

    const webBaseUrl = this.configService.get<string>('WEB_BASE_URL') || this.configService.get<string>('app.webBaseUrl');
    const magicLinkUrl = `${webBaseUrl}/endorse/${rawToken}`;

    await this.mailService.sendPresidentReviewRequest(application.id, magicLinkUrl);

    await this.prisma.notificationLog.create({
      data: {
        applicationId,
        recipientEmail: application.presidentEmail,
        notificationType: NotificationType.PRESIDENT_REVIEW_REQUEST as any,
        queueJobId: job.id,
        sentAt: new Date(),
      },
    });

    await this.auditService.log({
      applicationId,
      actorEmail: 'system',
      actorRole: 'admin', // System actor
      action: 'president.link_sent',
    });
  }

  private async handleSendEmail(
    job: Job<{ notificationType: NotificationType; applicationId: string; daysLeft?: 90 | 30 }>,
  ): Promise<void> {
    const { notificationType, applicationId, daysLeft } = job.data;

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    try {
      switch (notificationType) {
        case NotificationType.SUBMISSION_CONFIRMATION:
          await this.mailService.sendSubmissionConfirmation(applicationId);
          break;
        case NotificationType.CHANGES_REQUESTED:
          await this.mailService.sendChangesRequested(applicationId);
          break;
        case NotificationType.ENDORSED:
          await this.mailService.sendEndorsed(applicationId);
          break;
        case NotificationType.SECRETARY_REVIEW_PENDING:
          await this.mailService.sendSecretaryReviewPending(applicationId);
          break;
        case NotificationType.APPROVED:
          await this.mailService.sendApproved(applicationId);
          break;
        case NotificationType.REJECTED:
          await this.mailService.sendRejected(applicationId);
          break;
        case NotificationType.EXPIRED:
          await this.mailService.sendExpired(applicationId);
          break;
        case NotificationType.RENEWAL_REMINDER_90D:
        case NotificationType.RENEWAL_REMINDER_30D:
          if (daysLeft) {
            await this.mailService.sendRenewalReminder(applicationId, daysLeft);
          }
          break;
        default:
          throw new Error(`Unsupported notification type: ${notificationType}`);
      }

      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email, // Depends on the type, but usually applicant's email
          notificationType: notificationType as any,
          queueJobId: job.id,
          sentAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email,
          notificationType: notificationType as any,
          queueJobId: job.id,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }
}
