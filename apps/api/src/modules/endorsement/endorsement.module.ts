import { Module } from '@nestjs/common';
import { EndorsementController } from './endorsement.controller';
import { EndorsementService } from './endorsement.service';
import { TokensModule } from '../tokens/tokens.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TokensModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [EndorsementController],
  providers: [EndorsementService],
})
export class EndorsementModule {}
