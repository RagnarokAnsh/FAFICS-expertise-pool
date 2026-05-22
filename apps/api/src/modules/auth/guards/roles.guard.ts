import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RBAC guard — checks if the authenticated user's role
 * matches one of the roles specified by the @Roles() decorator.
 *
 * Must be used AFTER JwtAuthGuard so that req.user is populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @Roles() decorator is present, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied — no role assigned');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied — requires one of: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
