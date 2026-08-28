import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { NotificationType, TokenPurpose } from '@fafics/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Sends a standard notification email and logs the outcome.
   * Returns true on success, false on failure — callers that need to react to
   * the result (e.g. only stamp a "reminder sent" timestamp on success) can
   * check it; fire-and-forget callers can ignore it.
   */
  async sendEmail(
    notificationType: NotificationType,
    applicationId: string,
    daysLeft?: 90 | 30,
  ): Promise<boolean> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      this.logger.error(`sendEmail: application ${applicationId} not found`);
      return false;
    }

    try {
      let result: { messageId: string };

      switch (notificationType) {
        case NotificationType.SUBMISSION_CONFIRMATION:
          result = await this.mailService.sendSubmissionConfirmation(applicationId);
          break;
        case NotificationType.CHANGES_REQUESTED: {
          // Mint a single-use edit token so the email links the applicant
          // straight to the editable form (not the status page).
          const { rawToken } = await this.tokensService.generate({
            purpose: TokenPurpose.APPLICANT_EDIT,
            applicationId,
            recipientEmail: application.email,
            ttlMs: 30 * 24 * 60 * 60 * 1000,
          });
          const webBaseUrl =
            this.configService.get<string>('app.webBaseUrl') ||
            this.configService.get<string>('WEB_BASE_URL') ||
            'http://localhost:3000';
          const resumeUrl = `${webBaseUrl}/apply/resume/${rawToken}`;
          result = await this.mailService.sendChangesRequested(applicationId, resumeUrl);
          break;
        }
        case NotificationType.ENDORSED:
          result = await this.mailService.sendEndorsed(applicationId);
          break;
        case NotificationType.SECRETARY_REVIEW_PENDING:
          result = await this.mailService.sendSecretaryReviewPending(applicationId);
          break;
        case NotificationType.APPROVED:
          result = await this.mailService.sendApproved(applicationId);
          break;
        case NotificationType.REJECTED:
          result = await this.mailService.sendRejected(applicationId);
          break;
        case NotificationType.EXPIRED:
          result = await this.mailService.sendExpired(applicationId);
          break;
        case NotificationType.RENEWAL_REMINDER_90D:
        case NotificationType.RENEWAL_REMINDER_30D:
          if (!daysLeft) throw new Error('daysLeft required for renewal reminders');
          result = await this.mailService.sendRenewalReminder(applicationId, daysLeft);
          break;
        default:
          throw new Error(`Unsupported notification type: ${notificationType}`);
      }

      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email,
          notificationType: notificationType as any,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send ${notificationType} for ${applicationId}: ${error.message}`);
      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email,
          notificationType: notificationType as any,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
      return false;
    }
  }

  /**
   * Mints a single-use password-reset token for a dashboard user and emails the
   * link. Returns silently when the user does not exist or has no login — the
   * caller (forgot-password) must not reveal which addresses are registered.
   *
   * Any outstanding reset tokens for the user are invalidated first, so only the
   * most recent link works.
   */
  async sendPasswordResetLink(
    userId: string,
    opts: { triggeredByAdmin?: boolean } = {},
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      this.logger.warn(`sendPasswordResetLink: user ${userId} not found or inactive`);
      return false;
    }

    try {
      // Burn any live reset links for this user so a stale email cannot be
      // replayed after a newer one is requested.
      await this.prisma.magicToken.updateMany({
        where: { userId, purpose: TokenPurpose.PASSWORD_RESET as any, usedAt: null },
        data: { usedAt: new Date() },
      });

      const ttlMs = Number(
        this.configService.get('PASSWORD_RESET_TTL_MS') ?? 60 * 60 * 1000,
      );
      const { rawToken } = await this.tokensService.generate({
        purpose: TokenPurpose.PASSWORD_RESET,
        userId,
        recipientEmail: user.email,
        ttlMs,
      });

      const webBaseUrl =
        this.configService.get<string>('app.webBaseUrl') ||
        this.configService.get<string>('WEB_BASE_URL') ||
        'http://localhost:3000';
      const resetUrl = `${webBaseUrl.replace(/\/+$/, '')}/admin/reset-password/${rawToken}`;

      const result = await this.mailService.sendPasswordReset({
        to: user.email,
        recipientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        resetUrl,
        validFor: formatDuration(ttlMs),
        triggeredByAdmin: opts.triggeredByAdmin,
      });

      await this.prisma.notificationLog.create({
        data: {
          recipientEmail: user.email,
          notificationType: NotificationType.PASSWORD_RESET as any,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset for ${user.email}: ${error.message}`);
      await this.prisma.notificationLog.create({
        data: {
          recipientEmail: user.email,
          notificationType: NotificationType.PASSWORD_RESET as any,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
      return false;
    }
  }

  /**
   * Notifies a user that their password changed. Best-effort: a delivery failure
   * must never roll back the password change that already succeeded.
   */
  async sendPasswordChangedNotice(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    try {
      const result = await this.mailService.sendPasswordChanged({
        to: user.email,
        recipientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        changedAt: user.passwordChangedAt ?? new Date(),
      });
      await this.prisma.notificationLog.create({
        data: {
          recipientEmail: user.email,
          notificationType: NotificationType.PASSWORD_CHANGED as any,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to send password-changed notice to ${user.email}: ${error.message}`);
      await this.prisma.notificationLog.create({
        data: {
          recipientEmail: user.email,
          notificationType: NotificationType.PASSWORD_CHANGED as any,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  async sendPresidentLink(applicationId: string): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      this.logger.error(`sendPresidentLink: application ${applicationId} not found`);
      return;
    }

    try {
      const ttlMs = this.configService.get<number>('PRESIDENT_LINK_TTL_MS', 14 * 24 * 60 * 60 * 1000);
      const { rawToken } = await this.tokensService.reissue({
        applicationId,
        purpose: TokenPurpose.PRESIDENT_REVIEW,
        recipientEmail: application.presidentEmail,
        ttlMs,
      });

      const webBaseUrl =
        this.configService.get<string>('app.webBaseUrl') ||
        this.configService.get<string>('WEB_BASE_URL') ||
        'http://localhost:3000';
      const magicLinkUrl = `${webBaseUrl}/endorse/${rawToken}`;

      const result = await this.mailService.sendPresidentReviewRequest(applicationId, magicLinkUrl);

      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.presidentEmail,
          notificationType: NotificationType.PRESIDENT_REVIEW_REQUEST as any,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      await this.auditService.log({
        applicationId,
        actorEmail: 'system',
        actorRole: 'admin',
        action: 'president.link_sent',
      });
    } catch (error: any) {
      this.logger.error(`Failed to send president link for ${applicationId}: ${error.message}`);
      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.presidentEmail,
          notificationType: NotificationType.PRESIDENT_REVIEW_REQUEST as any,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  async sendDraftResumeLink(applicationId: string, existingRawToken?: string): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      this.logger.error(`sendDraftResumeLink: application ${applicationId} not found`);
      return;
    }

    try {
      // Reuse the caller's token when provided (e.g. the edit token minted in
      // createDraft) so a draft has a single ownership token; otherwise mint one.
      const rawToken =
        existingRawToken ??
        (
          await this.tokensService.generate({
            purpose: TokenPurpose.APPLICANT_EDIT,
            applicationId,
            recipientEmail: application.email,
            ttlMs: 30 * 24 * 60 * 60 * 1000,
          })
        ).rawToken;

      const webBaseUrl =
        this.configService.get<string>('app.webBaseUrl') ||
        this.configService.get<string>('WEB_BASE_URL') ||
        'http://localhost:3000';
      const resumeUrl = `${webBaseUrl}/apply/resume/${rawToken}`;

      const result = await this.mailService.sendDraftSavedEmail(applicationId, resumeUrl);

      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email,
          notificationType: NotificationType.DRAFT_SAVED_LINK as any,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      await this.auditService.log({
        applicationId,
        actorEmail: application.email,
        actorRole: 'member',
        action: 'application.draft_link_sent',
      });
    } catch (error: any) {
      this.logger.error(`Failed to send draft resume link for ${applicationId}: ${error.message}`);
      await this.prisma.notificationLog.create({
        data: {
          applicationId,
          recipientEmail: application.email,
          notificationType: NotificationType.DRAFT_SAVED_LINK as any,
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  async retryNotification(logId: string): Promise<{ id: string }> {
    const log = await this.prisma.notificationLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException(`Notification log ${logId} not found`);
    if (!log.applicationId) throw new BadRequestException('Cannot retry: no application linked to this log');

    const type = log.notificationType as NotificationType;

    switch (type) {
      case NotificationType.PRESIDENT_REVIEW_REQUEST:
        await this.sendPresidentLink(log.applicationId);
        break;
      case NotificationType.DRAFT_SAVED_LINK:
        await this.sendDraftResumeLink(log.applicationId);
        break;
      case NotificationType.RENEWAL_REMINDER_90D:
        await this.sendEmail(type, log.applicationId, 90);
        break;
      case NotificationType.RENEWAL_REMINDER_30D:
        await this.sendEmail(type, log.applicationId, 30);
        break;
      default:
        await this.sendEmail(type, log.applicationId);
    }

    const newLog = await this.prisma.notificationLog.findFirst({
      where: { applicationId: log.applicationId, notificationType: log.notificationType },
      orderBy: { createdAt: 'desc' },
    });

    return { id: newLog?.id ?? logId };
  }

  async listNotifications(filters: {
    applicationId?: string;
    failedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { applicationId, failedOnly, page = 1, limit = 50 } = filters;
    const where: any = {};
    if (applicationId) where.applicationId = applicationId;
    if (failedOnly) where.failedAt = { not: null };

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}

/** Renders a TTL in milliseconds as "1 hour" / "30 minutes" for email copy. */
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
