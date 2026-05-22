import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from './processors/email.processor';
import { MaintenanceProcessor } from './processors/maintenance.processor';
import { MaintenanceScheduler } from './schedulers/maintenance.scheduler';
import { TokensModule } from '../tokens/tokens.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TokensModule,
    MailModule, // Need to make sure MailModule exports MailService
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url') || config.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'email',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: 'maintenance',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 60000 },
        },
      },
    ),
  ],
  providers: [EmailProcessor, MaintenanceProcessor, MaintenanceScheduler],
  exports: [BullModule],
})
export class QueueModule {}
