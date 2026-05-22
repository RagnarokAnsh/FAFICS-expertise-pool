import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates JWT Bearer tokens.
 * Applied to all protected admin routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
