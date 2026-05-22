import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@fafics/shared';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access to specific user roles.
 * Used with RolesGuard to enforce RBAC.
 *
 * @example @Roles('secretary', 'admin')
 */
export const Roles = (...roles: (UserRole | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
