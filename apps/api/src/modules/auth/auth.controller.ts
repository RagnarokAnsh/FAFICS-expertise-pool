import { Controller, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { AuditService } from '../audit/audit.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /api/auth/login
   * Authenticates an officer and returns a JWT access token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Officer login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: TokenResponseDto, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: any): Promise<TokenResponseDto> {
    const result = await this.authService.login(req.user);

    // Audit log for successful login
    await this.auditService.log({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'user.login',
    });

    return result;
  }
}
