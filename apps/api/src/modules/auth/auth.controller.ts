import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, CookieOptions } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
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

  /**
   * GET /api/auth/me
   * Returns the signed-in officer, so the account page can show who is logged in
   * without a second round trip through the admin endpoints.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Current officer profile' })
  @ApiResponse({ status: 200, description: 'The signed-in user' })
  async me(@CurrentUser() user: { userId: string; email: string; role: string }) {
    return user;
  }

  /**
   * POST /api/auth/forgot-password
   * Always answers 200 with the same message whether or not the address is
   * registered — a differing response would let anyone enumerate officer
   * accounts. Rate-limited because it sends mail.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset link sent if the account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account exists for that address, a password reset link has been sent to it.',
    };
  }

  /**
   * POST /api/auth/reset-password
   * Consumes the single-use token from the emailed link and sets a new password.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 410, description: 'Link expired or already used' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email } = await this.authService.resetPassword(dto.token, dto.password);

    await this.auditService.log({
      actorEmail: email,
      actorRole: 'admin',
      action: 'user.password_reset',
    });

    return { message: 'Your password has been updated. You can now sign in.' };
  }

  /**
   * POST /api/auth/change-password
   * Signed-in password change. The auth cookie is cleared afterwards so the user
   * re-authenticates with the new credentials on every device sharing it.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change your own password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { userId: string; email: string; role: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);

    await this.auditService.log({
      actorId: user.userId,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'user.password_changed',
    });

    const { maxAge: _maxAge, ...clearOpts } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE, clearOpts);

    return { message: 'Password changed. Please sign in again with your new password.' };
  }
}
