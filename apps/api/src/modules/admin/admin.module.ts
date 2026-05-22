import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ExportModule } from '../export/export.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ExportModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
