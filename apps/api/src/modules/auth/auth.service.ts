import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { NotificationService } from '../mail/notification.service';
import { TokenPurpose } from '@fafics/shared';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@fafics/shared';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // A real bcrypt hash compared against when no user/password exists, so that
  // a missing account takes the same time as a wrong password. Without this,
  // response timing reveals which emails are registered (user enumeration).
  private readonly dummyHash = bcrypt.hashSync('timing-equalizer', 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokensService: TokensService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Validates user credentials.
   * Returns the user object (without password) if valid, null otherwise.
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      // Perform a throwaway comparison to equalize timing with the valid path.
      await bcrypt.compare(password, this.dummyHash);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Signs a JWT for the authenticated user and updates lastLoginAt.
   */
  async login(user: any): Promise<{ accessToken: string; role: UserRole }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      accessToken,
      role: user.role as UserRole,
    };
  }

  /**
   * Starts a password reset. Deliberately returns nothing that distinguishes a
   * registered address from an unregistered one: the controller always answers
   * 200 with the same message, so this endpoint cannot be used to enumerate
   * accounts. Inactive accounts are treated the same way.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive || !user.passwordHash) {
      this.logger.log(`Password reset requested for unknown/ineligible address: ${email}`);
      return;
    }

    await this.notificationService.sendPasswordResetLink(user.id);
    this.logger.log(`Password reset link sent to ${user.email}`);
  }

  /**
   * Completes a password reset. The magic token is consumed (marked used) by
   * TokensService.validate, so the link cannot be replayed.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<{ email: string }> {
    // peek() checks validity WITHOUT consuming the token, so a token of another
    // purpose (e.g. a president endorsement link) posted here is rejected
    // without being burned. Only once the purpose matches do we consume it.
    const preview = await this.tokensService.peek(rawToken);
    if (preview.purpose !== TokenPurpose.PASSWORD_RESET) {
      throw new BadRequestException('This link is not a password reset link.');
    }
    if (!preview.userId) {
      throw new BadRequestException('This reset link is not linked to an account.');
    }

    await this.tokensService.validate(rawToken);

    const user = await this.prisma.user.findUnique({ where: { id: preview.userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException('This account is no longer active.');
    }

    await this.setPassword(user.id, newPassword);

    this.logger.log(`Password reset completed for ${user.email}`);
    return { email: user.email };
  }

  /**
   * Changes the password of the signed-in user. Requires the current password,
   * so a hijacked but unauthenticated session cannot lock the owner out.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Account not found.');
    }

    const currentIsValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentIsValid) {
      throw new UnauthorizedException('Your current password is incorrect.');
    }

    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('The new password must differ from the current one.');
    }

    await this.setPassword(user.id, newPassword);
    this.logger.log(`Password changed for ${user.email}`);
  }

  /**
   * Writes a new password hash, stamps passwordChangedAt, burns any outstanding
   * reset links, and sends the "your password changed" notice. Shared by the
   * reset and change flows so both leave the account in the same state.
   */
  private async setPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      // Any other live reset link is now stale — a second email sitting in an
      // inbox must not be able to set the password again.
      this.prisma.magicToken.updateMany({
        where: { userId, purpose: TokenPurpose.PASSWORD_RESET as any, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    // Fire-and-log: the password is already changed, so a mail failure must not
    // surface as an error to the caller.
    await this.notificationService.sendPasswordChangedNotice(userId);
  }
}
