import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../tokens/tokens.service';
import { NotificationService } from '../mail/notification.service';
import { TokenPurpose } from '@fafics/shared';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@fafics/shared';
import { DatabaseService } from '../../database/database.service';
import { isOfficerRole } from './roles';

type User = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  associationId?: string | null;
  passwordHash?: string | null;
  isActive?: boolean;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // A real bcrypt hash compared against when no user/password exists, so that
  // a missing account takes the same time as a wrong password. Without this,
  // response timing reveals which emails are registered (user enumeration).
  private readonly dummyHash = bcrypt.hashSync('timing-equalizer', 12);

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly tokensService: TokensService,
    private readonly notificationService: NotificationService,
  ) {}

  private mapUser(row: any): User {
    return {
      ...row,
      passwordHash: row.password_hash ?? row.passwordHash ?? null,
      associationId: row.association_id ?? row.associationId ?? null,
      firstName: row.first_name ?? row.firstName ?? null,
      lastName: row.last_name ?? row.lastName ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      emailVerifiedAt: row.email_verified_at ?? row.emailVerifiedAt ?? null,
      lastLoginAt: row.last_login_at ?? row.lastLoginAt ?? null,
      passwordChangedAt: row.password_changed_at ?? row.passwordChangedAt ?? null,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  /**
   * Validates user credentials.
   * Returns the user object (without password) if valid, null otherwise.
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    const result = await this.database.query<any>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()],
    );
    const user = result.rows[0] ? this.mapUser(result.rows[0]) : null;

    // Only dashboard roles may sign in. Applicant (member) and president rows
    // normally have no password, but never rely on that alone.
    if (!user || !user.passwordHash || !user.isActive || !isOfficerRole(user.role)) {
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
    await this.database.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id],
    );

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
    const result = await this.database.query<any>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.toLowerCase().trim()],
    );
    const user = result.rows[0] ? this.mapUser(result.rows[0]) : null;

    if (!user || !user.isActive || !user.passwordHash || !isOfficerRole(user.role)) {
      this.logger.log(`Password reset requested for unknown/ineligible address: ${email}`);
      return;
    }

    // Not awaited: sending mail takes seconds, and a slower answer for
    // registered addresses would reveal which ones exist.
    void this.notificationService
      .sendPasswordResetLink(user.id)
      .then((sent) => this.logger.log(`Password reset link ${sent ? 'sent' : 'NOT sent'} to ${user.email}`))
      .catch((error) => this.logger.error(`Password reset for ${user.email} failed: ${error?.message}`));
  }

  /** Throws 404/410 if a reset link is unknown, used or expired. Never consumes it. */
  async checkResetToken(rawToken: string): Promise<void> {
    await this.tokensService.peek(rawToken, TokenPurpose.PASSWORD_RESET);
  }

  /**
   * Completes a password reset. The magic token is consumed (marked used) by
   * TokensService.validate, so the link cannot be replayed.
   */
  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ id: string; email: string; role: string }> {
    // peek() checks validity WITHOUT consuming the token, so a token of another
    // purpose (e.g. a president endorsement link) posted here is rejected
    // without being burned.
    const preview = await this.tokensService.peek(rawToken, TokenPurpose.PASSWORD_RESET);
    if (!preview.userId) {
      throw new BadRequestException('This reset link is not linked to an account.');
    }

    const result = await this.database.query<any>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [preview.userId],
    );
    const user = result.rows[0] ? this.mapUser(result.rows[0]) : null;
    if (!user || !user.isActive || !isOfficerRole(user.role)) {
      throw new BadRequestException('This account is no longer active.');
    }

    // The token is consumed inside the same transaction that writes the new
    // password, so a failure leaves the link usable instead of burning it.
    await this.setPassword(user.id, newPassword, preview.id);

    this.logger.log(`Password reset completed for ${user.email}`);
    return { id: user.id, email: user.email, role: user.role };
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
    const result = await this.database.query<any>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    const user = result.rows[0] ? this.mapUser(result.rows[0]) : null;
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
  private async setPassword(
    userId: string,
    newPassword: string,
    resetTokenId?: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.database.transaction(async (client) => {
      if (resetTokenId) {
        // Conditional consume: if the link was used meanwhile, nothing is changed.
        const consumed = await client.query(
          'UPDATE magic_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL AND expires_at > NOW()',
          [resetTokenId],
        );
        if (consumed.rowCount === 0) {
          throw new GoneException('This link has already been used or has expired.');
        }
      }
      await client.query(
        'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
        [passwordHash, userId],
      );
      // Any other live reset link is now stale — a second email sitting in an
      // inbox must not be able to set the password again.
      await client.query(
        'UPDATE magic_tokens SET used_at = NOW() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
        [userId, TokenPurpose.PASSWORD_RESET],
      );
    });

    // Fire-and-log: the password is already changed, so a mail failure must not
    // surface as an error to the caller.
    await this.notificationService.sendPasswordChangedNotice(userId);
  }
}
