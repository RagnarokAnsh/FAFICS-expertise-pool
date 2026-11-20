import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MaintenanceService } from '../maintenance.service';

@Injectable()
export class MaintenanceScheduler {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async runDailyMaintenance(): Promise<void> {
    // Each step runs even if an earlier one fails.
    const steps: Array<[string, () => Promise<void>]> = [
      ['expireApplications', () => this.maintenanceService.expireApplications()],
      ['sendPresidentReminders', () => this.maintenanceService.sendPresidentReminders()],
      ['sendRenewalReminders', () => this.maintenanceService.sendRenewalReminders()],
    ];
    for (const [name, run] of steps) {
      try {
        await run();
      } catch (err) {
        this.logger.error(`Daily maintenance step ${name} failed`, err as Error);
      }
    }
  }
}
