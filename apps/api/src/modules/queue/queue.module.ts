import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceScheduler } from './schedulers/maintenance.scheduler';
import { MailModule } from '../mail/mail.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [MailModule, TokensModule],
  providers: [MaintenanceService, MaintenanceScheduler],
})
export class QueueModule {}
