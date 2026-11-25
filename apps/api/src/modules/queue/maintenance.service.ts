import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../mail/notification.service';
import { ConfigService } from '@nestjs/config';
import { NotificationType, TokenPurpose } from '@fafics/shared';
import { deleteApplicationAndData } from '../applications/application-removal';

/** Days after submission on which a waiting President is reminded. */
export const PRESIDENT_REMINDER_DAYS = [3, 7] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days to keep retrying the "your profile expired" email before deleting anyway. */
const EXPIRY_EMAIL_GRACE_DAYS = 7;

/** Whole calendar days (UTC) from `from` to `to`, e.g. Mon 23:00 → Tue 01:00 is 1. */
function utcDaysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / DAY_MS);
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Profiles last three years. Past their expiry date they leave the pool
   * (status 'expired'), the member is emailed that they can apply again, and
   * the application and its data are deleted. If the email fails it is
   * retried on the following nights; after a week the data is deleted anyway.
   */
  async expireApplications(): Promise<void> {
    const rows = await this.prisma.$queryRaw<{ expired: number }[]>`
      SELECT fn_expire_applications() AS expired
    `;
    this.logger.log(`Expiry run complete. Applications expired: ${rows[0]?.expired ?? 0}`);
    await this.removeExpiredProfiles();
    await this.reissueExpiredPresidentLinks();
  }

  private async removeExpiredProfiles(): Promise<void> {
    const graceCutoff = new Date(Date.now() - EXPIRY_EMAIL_GRACE_DAYS * DAY_MS);
    const expired = await this.prisma.application.findMany({
      where: { status: 'expired' },
      select: { id: true, expiresAt: true },
    });

    let removed = 0;
    for (const app of expired) {
      const emailed = await this.notificationService.sendEmail(NotificationType.EXPIRED, app.id);
      const graceOver = !app.expiresAt || app.expiresAt < graceCutoff;
      if (!emailed && !graceOver) continue; // try the email again tomorrow
      try {
        await deleteApplicationAndData(this.prisma, app.id, {
          action: 'application.expired_removed',
          actorEmail: 'system',
          actorRole: 'admin',
          metadata: { expiryEmailSent: emailed },
        });
        removed++;
      } catch (err) {
        this.logger.error(`Failed to remove expired application ${app.id}:`, err as Error);
      }
    }
    this.logger.log(`Expired profiles removed: ${removed}`);
  }

  private async reissueExpiredPresidentLinks(): Promise<void> {
    const now = new Date();
    const ttlMs = this.configService.get<number>('PRESIDENT_LINK_TTL_MS', 14 * 24 * 60 * 60 * 1000);
    const webBaseUrl = this.configService.get<string>(
      'app.webBaseUrl',
      this.configService.get<string>('WEB_BASE_URL', 'http://localhost:3000'),
    );

    const expiredTokens = await this.prisma.magicToken.findMany({
      where: {
        purpose: 'president_review' as any,
        usedAt: null,
        expiresAt: { lt: now },
      },
      include: { application: true },
    });

    // An application can have several president links (officer resends and
    // reminders keep the earlier ones working), so handle each one once.
    const handled = new Set<string>();
    for (const token of expiredTokens) {
      if (!token.application || token.application.status !== 'submitted') continue;
      if (handled.has(token.applicationId!)) continue;
      handled.add(token.applicationId!);

      // A newer link sent by a resend or a reminder may still be valid. The
      // President can use it, so there is nothing to reissue yet.
      const liveLinks = await this.prisma.magicToken.count({
        where: {
          applicationId: token.applicationId,
          purpose: 'president_review' as any,
          usedAt: null,
          expiresAt: { gte: now },
        },
      });
      if (liveLinks > 0) continue;

      try {
        const { rawToken } = await this.tokensService.reissue({
          applicationId: token.applicationId!,
          purpose: TokenPurpose.PRESIDENT_REVIEW,
          // The application's current address, in case an officer corrected it.
          recipientEmail: token.application.presidentEmail,
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

  /**
   * Reminds Presidents who have neither endorsed nor returned an application.
   * Reminders go out on the 3rd and 7th calendar day (UTC) after the latest
   * submission; a resubmission starts the count again.
   *
   * At most one reminder per application per run, and the second waits until
   * 4 days after the first. So applications that were already waiting longer
   * when this was released get the first reminder on the next run and the
   * second 4 days later, not both on the same night.
   *
   * Sent reminders are counted from their `president.reminder_sent` audit rows,
   * which are only written when the email went out.
   */
  async sendPresidentReminders(): Promise<void> {
    const now = new Date();
    const firstDay = PRESIDENT_REMINDER_DAYS[0];

    const waiting = await this.prisma.application.findMany({
      where: {
        status: 'submitted',
        submittedAt: { lt: new Date(now.getTime() - (firstDay - 1) * DAY_MS) },
      },
      select: {
        id: true,
        submittedAt: true,
        auditLogs: {
          where: { action: 'president.reminder_sent' },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        // Links created in the last day: an officer resend, a corrected email
        // or the expired-link reissue above. The President just got an email.
        magicTokens: {
          where: { purpose: 'president_review' as any, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
          select: { id: true },
        },
      },
    });

    let sentCount = 0;
    for (const app of waiting) {
      if (!app.submittedAt) continue;
      if (app.magicTokens.length > 0) continue;
      const sent = app.auditLogs.filter((log) => log.createdAt >= app.submittedAt!);
      if (sent.length >= PRESIDENT_REMINDER_DAYS.length) continue;

      const day = PRESIDENT_REMINDER_DAYS[sent.length];
      if (utcDaysBetween(app.submittedAt, now) < day) continue;
      if (sent.length > 0) {
        const gap = day - PRESIDENT_REMINDER_DAYS[sent.length - 1];
        if (utcDaysBetween(sent[sent.length - 1].createdAt, now) < gap) continue;
      }

      if (await this.notificationService.sendPresidentReminder(app.id, day)) sentCount++;
    }
    this.logger.log(`President reminders sent: ${sentCount}`);
  }

  async sendRenewalReminders(): Promise<void> {
    const now = new Date();

    const nowPlus30 = new Date();
    nowPlus30.setDate(nowPlus30.getDate() + 30);

    const nowPlus90 = new Date();
    nowPlus90.setDate(nowPlus90.getDate() + 90);


    const apps90d = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        // More than 30 days left: closer than that, only the 30-day email is due.
        expiresAt: { gt: nowPlus30, lte: nowPlus90 },
        renewalReminder90dSentAt: null,
      },
    });

    for (const app of apps90d) {
      const sent = await this.notificationService.sendEmail(NotificationType.RENEWAL_REMINDER_90D, app.id);
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
      const sent = await this.notificationService.sendEmail(NotificationType.RENEWAL_REMINDER_30D, app.id);
      if (sent) {
        await this.prisma.application.update({
          where: { id: app.id },
          data: { renewalReminder30dSentAt: new Date() },
        });
      }
    }
  }
}
