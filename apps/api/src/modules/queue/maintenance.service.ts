import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../mail/notification.service';
import { ConfigService } from '@nestjs/config';
import { NotificationType, TokenPurpose } from '@fafics/shared';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  async expireApplications(): Promise<void> {
    const result = await this.prisma.$executeRaw`SELECT fn_expire_applications()`;
    this.logger.log(`Expiry run complete. Rows affected: ${result}`);
    await this.reissueExpiredPresidentLinks();
  }

  private async reissueExpiredPresidentLinks(): Promise<void> {
    const now = new Date();
    const ttlMs = this.configService.get<number>('PRESIDENT_LINK_TTL_MS', 14 * 24 * 60 * 60 * 1000);
    const webBaseUrl = this.configService.get<string>('WEB_BASE_URL', 'http://localhost:3000');

    const expiredTokens = await this.prisma.magicToken.findMany({
      where: {
        purpose: 'president_review' as any,
        usedAt: null,
        expiresAt: { lt: now },
      },
      include: { application: true },
    });

    for (const token of expiredTokens) {
      if (!token.application || token.application.status !== 'submitted') continue;

      try {
        const { rawToken } = await this.tokensService.reissue({
          applicationId: token.applicationId!,
          purpose: TokenPurpose.PRESIDENT_REVIEW,
          recipientEmail: token.recipientEmail,
          ttlMs,
        });

        const magicLinkUrl = `${webBaseUrl}/endorse/${rawToken}`;
        await this.mailService.sendPresidentLinkExpired(token.applicationId!, magicLinkUrl);
        this.logger.log(`Reissued president link for application ${token.applicationId}`);
      } catch (err) {
        this.logger.error(`Failed to reissue president link for application ${token.applicationId}:`, err);
      }
    }
  }

  async sendRenewalReminders(): Promise<void> {
    const now = new Date();

    const nowPlus90 = new Date();
    nowPlus90.setDate(nowPlus90.getDate() + 90);

    const nowPlus30 = new Date();
    nowPlus30.setDate(nowPlus30.getDate() + 30);

    const apps90d = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        expiresAt: { gte: now, lte: nowPlus90 },
        renewalReminder90dSentAt: null,
      },
    });

    for (const app of apps90d) {
      const sent = await this.notificationService.sendEmail(NotificationType.RENEWAL_REMINDER_90D, app.id, 90);
      // Only mark the reminder as sent if the email actually went out, so a
      // failed send is retried on the next run instead of being lost.
      if (sent) {
        await this.prisma.application.update({
          where: { id: app.id },
          data: { renewalReminder90dSentAt: new Date() },
        });
      }
    }

    const apps30d = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        expiresAt: { gte: now, lte: nowPlus30 },
        renewalReminder30dSentAt: null,
      },
    });

    for (const app of apps30d) {
      const sent = await this.notificationService.sendEmail(NotificationType.RENEWAL_REMINDER_30D, app.id, 30);
      if (sent) {
        await this.prisma.application.update({
          where: { id: app.id },
          data: { renewalReminder30dSentAt: new Date() },
        });
      }
    }
  }
}
