import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AUTH_COOKIE } from '../auth.controller';
import { DatabaseService } from '../../../database/database.service';
import { isOfficerRole } from '../roles';

/**
 * Reads the JWT from the HttpOnly `fafics_token` cookie. Parses the raw Cookie
 * header directly so no cookie-parser middleware dependency is required.
 */
function cookieExtractor(req: Request): string | null {
  const header = req?.headers?.cookie;
  if (!header) return null;
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(AUTH_COOKIE.length + 1)) : null;
}

/**
 * JWT Passport strategy.
 * Extracts the token from the HttpOnly auth cookie (browser app) or the
 * Authorization: Bearer header (API clients / Swagger) and verifies it against
 * JWT_SECRET.
 *
 * The signature alone is not trusted for authorisation: the account is re-read
 * on every request, so deactivating a user, changing their role or changing
 * their password takes effect immediately instead of when the 8h token expires.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly database: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  /**
   * Called after token verification succeeds. Returns what is attached to
   * req.user — the role comes from the database, not from the token.
   */
  async validate(payload: { sub: string; email: string; role: string; iat?: number }) {
    const { rows } = await this.database.query<{
      id: string;
      email: string;
      role: string;
      is_active: boolean;
      password_changed_at: Date | null;
    }>(
      'SELECT id, email, role, is_active, password_changed_at FROM users WHERE id = $1',
      [payload.sub],
    );
    const user = rows[0];

    if (!user || !user.is_active || !isOfficerRole(user.role)) {
      throw new UnauthorizedException('Your session is no longer valid. Please sign in again.');
    }

    // A password change signs out every session issued before it. iat has
    // one-second resolution, so compare at that resolution.
    if (
      user.password_changed_at &&
      payload.iat !== undefined &&
      payload.iat < Math.floor(user.password_changed_at.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Your password was changed. Please sign in again.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
