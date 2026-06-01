import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationService } from './notification.service';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [TokensModule],
  providers: [MailService, NotificationService],
  exports: [MailService, NotificationService],
})
export class MailModule {}
