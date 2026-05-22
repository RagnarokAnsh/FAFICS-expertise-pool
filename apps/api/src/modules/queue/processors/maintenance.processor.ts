import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueJobType, NotificationType } from '@fafics/shared';

@Processor('maintenance')
export class MaintenanceProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case QueueJobType.EXPIRE_APPLICATIONS:
        return this.handleExpire(job);
      case QueueJobType.SEND_RENEWAL_REMINDER:
        return this.handleRenewalReminder(job);
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleExpire(job: Job): Promise<void> {
    const result = await this.prisma.$executeRaw`SELECT fn_expire_applications()`;
    console.log(`Expiry run complete. Rows affected: ${result}`);
  }

  private async handleRenewalReminder(job: Job): Promise<void> {
    const now = new Date();
    const nowPlus90 = new Date();
    nowPlus90.setDate(nowPlus90.getDate() + 90);

    const nowPlus30 = new Date();
    nowPlus30.setDate(nowPlus30.getDate() + 30);

    // 90 days reminder
    const apps90d = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gte: now,
          lte: nowPlus90,
        },
        renewalReminder90dSentAt: null,
      },
    });

    for (const app of apps90d) {
      await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
        notificationType: NotificationType.RENEWAL_REMINDER_90D,
        applicationId: app.id,
        daysLeft: 90,
      });

      await this.prisma.application.update({
        where: { id: app.id },
        data: { renewalReminder90dSentAt: new Date() },
      });
    }

    // 30 days reminder
    const apps30d = await this.prisma.application.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gte: now,
          lte: nowPlus30,
        },
        renewalReminder30dSentAt: null,
      },
    });

    for (const app of apps30d) {
      await this.emailQueue.add(QueueJobType.SEND_EMAIL, {
        notificationType: NotificationType.RENEWAL_REMINDER_30D,
        applicationId: app.id,
        daysLeft: 30,
      });

      await this.prisma.application.update({
        where: { id: app.id },
        data: { renewalReminder30dSentAt: new Date() },
      });
    }
  }
}
