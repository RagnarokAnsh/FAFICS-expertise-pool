import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AUTH_COOKIE } from '../auth.controller';

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
 * Authorization: Bearer header (API clients / Swagger), validates it against
 * JWT_SECRET, and attaches the decoded payload to req.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Called after token verification succeeds.
   * Returns the payload that will be attached to req.user.
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
