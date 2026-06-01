import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ExportModule } from '../export/export.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ExportModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
