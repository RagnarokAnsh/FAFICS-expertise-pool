import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MaintenanceService } from '../maintenance.service';

@Injectable()
export class MaintenanceScheduler {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async runDailyMaintenance(): Promise<void> {
    await this.maintenanceService.expireApplications();
    await this.maintenanceService.sendRenewalReminders();
  }
}
