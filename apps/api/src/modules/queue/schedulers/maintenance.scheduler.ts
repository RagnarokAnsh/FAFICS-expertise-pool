import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJobType } from '@fafics/shared';

@Injectable()
export class MaintenanceScheduler {
  constructor(@InjectQueue('maintenance') private readonly maintenanceQueue: Queue) {}

  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async runDailyMaintenance(): Promise<void> {
    await this.maintenanceQueue.add(QueueJobType.EXPIRE_APPLICATIONS, {});
    await this.maintenanceQueue.add(QueueJobType.SEND_RENEWAL_REMINDER, {});
  }
}
