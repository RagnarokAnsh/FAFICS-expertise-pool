import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

import { BullModule } from '@nestjs/bullmq';

/**
 * ApplicationsModule encapsulates the core application CRUD endpoints.
 * PrismaService and AuditService are injected via global modules.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
