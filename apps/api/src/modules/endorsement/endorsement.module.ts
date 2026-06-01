import { Module } from '@nestjs/common';
import { EndorsementController } from './endorsement.controller';
import { EndorsementService } from './endorsement.service';
import { TokensModule } from '../tokens/tokens.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TokensModule, MailModule],
  controllers: [EndorsementController],
  providers: [EndorsementService],
})
export class EndorsementModule {}
