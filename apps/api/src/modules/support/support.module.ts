import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

/**
 * CIMP support integration. Exposes GET /api/support/handoff, which redirects a
 * signed-in officer to the CIMP reporter portal with a signed hand-off token.
 *
 * JwtModule is registered with no secret here because SupportService passes the
 * CIMP per-platform secret per sign() call — it must NOT use FAFICS's JWT_SECRET.
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
