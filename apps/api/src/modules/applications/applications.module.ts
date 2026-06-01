import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { MailModule } from '../mail/mail.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [MailModule, TokensModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
