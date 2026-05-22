import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for the login endpoint.
 * Validates email + password via Passport local strategy.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
