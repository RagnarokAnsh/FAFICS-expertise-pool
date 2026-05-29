import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../mail/mail.module';
import { TokensModule } from '../tokens/tokens.module';

/**
 * ApplicationsModule encapsulates the core application CRUD endpoints.
 * PrismaService and AuditService are injected via global modules.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    MailModule,
    TokensModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
