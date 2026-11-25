import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** What JwtStrategy.validate() attaches to req.user. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extracts the authenticated user from the request object.
 * The user is attached by the JwtStrategy after token validation.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
