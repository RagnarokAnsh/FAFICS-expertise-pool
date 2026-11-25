import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { currentRole } from '../lib/auth/roles';

/**
 * Keeps officers off pages their role cannot use (they would only see 403s),
 * sending them to the dashboard instead. Convenience only — the API enforces
 * the same rules on every request.
 */
export function roleGuard(allowed: (role: string | null) => boolean): CanActivateFn {
  return () => allowed(currentRole()) || inject(Router).parseUrl('/admin/dashboard');
}
