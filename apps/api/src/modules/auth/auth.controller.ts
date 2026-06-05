import { Controller, Post, UseGuards, Request, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, CookieOptions } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { AuditService } from '../audit/audit.service';

/** Name of the HttpOnly cookie holding the officer JWT. */
export const AUTH_COOKIE = 'fafics_token';

/**
 * Cookie options for the auth cookie. HttpOnly keeps the JWT out of reach of
 * JavaScript (so XSS cannot steal the session). In production it is also Secure
 * and SameSite=None so it works over HTTPS when the web app and API are on
 * different sites; in dev it is SameSite=Lax over plain localhost.
 */
function authCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8h — matches JWT_EXPIRES_IN default
    path: '/',
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /api/auth/login
   * Authenticates an officer and sets the JWT as an HttpOnly cookie.
   * The token is also returned in the body for API clients / Swagger, but the
   * browser app relies on the cookie and never stores the token in JS.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // max 5 login attempts / min / IP
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Officer login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: TokenResponseDto, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const result = await this.authService.login(req.user);

    res.cookie(AUTH_COOKIE, result.accessToken, authCookieOptions());

    // Audit log for successful login
    await this.auditService.log({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'user.login',
    });

    return result;
  }

  /**
   * POST /api/auth/logout
   * Clears the auth cookie. Stateless JWT, so nothing server-side to revoke.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Officer logout' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const { maxAge: _maxAge, ...clearOpts } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE, clearOpts);
    return { message: 'Logged out' };
  }
}
