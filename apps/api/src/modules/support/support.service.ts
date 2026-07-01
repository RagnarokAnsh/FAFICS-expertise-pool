import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Mints a CIMP hand-off token for the signed-in officer and builds the reporter
 * URL to redirect them to.
 *
 * The token is signed with FAFICS's per-platform CIMP secret (HS256, 5-minute
 * expiry) — CIMP's HandoffGuard verifies it exactly as it would a token from any
 * external portal. `req.user` only carries id/email/role, so we look up the
 * officer's name from the database to satisfy CIMP's required claims.
 */
@Injectable()
export class SupportService {
  private readonly platformKey?: string;
  private readonly handoffSecret?: string;
  private readonly baseUrl?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.platformKey = config.get<string>('support.platformKey');
    this.handoffSecret = config.get<string>('support.handoffSecret');
    this.baseUrl = config.get<string>('support.baseUrl');
  }

  async handoffUrlForUser(userId: string): Promise<string> {
    if (!this.platformKey || !this.handoffSecret || !this.baseUrl) {
      throw new ServiceUnavailableException(
        'CIMP support is not configured (set CIMP_PLATFORM_KEY, CIMP_HANDOFF_SECRET, CIMP_SUPPORT_URL).',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email;

    const token = this.jwt.sign(
      {
        platformKey: this.platformKey,
        portalUserId: user.id,
        name,
        email: user.email,
      },
      { secret: this.handoffSecret, expiresIn: '5m' },
    );

    const base = this.baseUrl.replace(/\/+$/, '');
    return `${base}/reporter/new?handoff=${encodeURIComponent(token)}`;
  }
}
