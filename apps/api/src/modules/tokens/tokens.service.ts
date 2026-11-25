import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TokenPurpose } from '@fafics/shared';
import * as crypto from 'crypto';

type MagicToken = {
  id: string;
  tokenHash: string;
  purpose: string;
  applicationId?: string | null;
  userId?: string | null;
  recipientEmail: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

@Injectable()
export class TokensService {
  constructor(private readonly database: DatabaseService) {}

  private mapMagicToken(row: any): MagicToken {
    return {
      ...row,
      tokenHash: row.token_hash ?? row.tokenHash,
      applicationId: row.application_id ?? row.applicationId ?? null,
      userId: row.user_id ?? row.userId ?? null,
      recipientEmail: row.recipient_email ?? row.recipientEmail,
      expiresAt: row.expires_at ?? row.expiresAt,
      usedAt: row.used_at ?? row.usedAt ?? null,
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  async generate(params: {
    purpose: TokenPurpose;
    applicationId?: string;
    userId?: string;
    recipientEmail: string;
    ttlMs: number;
  }): Promise<{ rawToken: string; tokenHash: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // Coerce ttlMs to a number: callers that pass a value straight from
    // ConfigService.get() hand us a STRING (e.g. PRESIDENT_LINK_TTL_MS), and
    // `Date.now() + "1209600000"` would string-concatenate into an Invalid Date.
    const ttlMs = Number(params.ttlMs);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error(`Invalid token ttlMs: ${params.ttlMs}`);
    }
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.database.query(
      `
        INSERT INTO magic_tokens (
          id,
          token_hash,
          purpose,
          application_id,
          user_id,
          recipient_email,
          expires_at,
          created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        tokenHash,
        params.purpose,
        params.applicationId ?? null,
        params.userId ?? null,
        params.recipientEmail,
        expiresAt,
      ],
    );

    return { rawToken, tokenHash };
  }

  /**
   * Checks a link token and, when `markUsed` is true, consumes it.
   *
   * `purpose` is required: a link only works for what it was issued for. A
   * link of another purpose fails exactly like an unknown one (404) and is not
   * consumed, so an applicant's own edit or view link can never open the
   * President's endorsement endpoints, and the reverse.
   *
   * A token that was invalidated (used_at set) is rejected even when
   * `markUsed` is false, so reissuing or cancelling a link really revokes it.
   */
  async validate(rawToken: string, purpose: TokenPurpose, markUsed: boolean = true): Promise<MagicToken> {
    const magicToken = await this.peek(rawToken, purpose);
    if (!markUsed) return magicToken;

    // Conditional update: of two concurrent requests presenting the same link,
    // only one can consume it.
    const updated = await this.database.query<any>(
      'UPDATE magic_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING *',
      [magicToken.id],
    );
    if (!updated.rows[0]) {
      throw new GoneException('This link has already been used');
    }
    return this.mapMagicToken(updated.rows[0]);
  }

  async invalidateForApplication(applicationId: string, purpose: TokenPurpose): Promise<void> {
    await this.database.query(
      'UPDATE magic_tokens SET used_at = NOW() WHERE application_id = $1 AND purpose = $2 AND used_at IS NULL',
      [applicationId, purpose],
    );
  }

  /**
   * Validates a token without marking it as used.
   * Use this for read-only operations (e.g., viewing application data).
   * The token remains valid for a subsequent validate() call.
   */
  async peek(rawToken: string, purpose: TokenPurpose): Promise<MagicToken> {
    // Tokens are 32 random bytes in hex; anything else cannot match.
    if (typeof rawToken !== 'string' || !/^[0-9a-f]{64}$/i.test(rawToken)) {
      throw new NotFoundException('Invalid or expired link');
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken.toLowerCase()).digest('hex');

    const result = await this.database.query<any>(
      'SELECT * FROM magic_tokens WHERE token_hash = $1 LIMIT 1',
      [tokenHash],
    );
    const magicToken = result.rows[0] ? this.mapMagicToken(result.rows[0]) : null;

    if (!magicToken || (magicToken.purpose as string) !== purpose) {
      throw new NotFoundException('Invalid or expired link');
    }

    if (magicToken.usedAt !== null) {
      throw new GoneException('This link has already been used');
    }

    if (magicToken.expiresAt.getTime() < Date.now()) {
      throw new GoneException('This link has expired');
    }

    return magicToken;
  }

  async reissue(params: {
    applicationId: string;
    purpose: TokenPurpose;
    recipientEmail: string;
    ttlMs: number;
  }): Promise<{ rawToken: string }> {
    await this.invalidateForApplication(params.applicationId, params.purpose);
    const result = await this.generate(params);
    return { rawToken: result.rawToken };
  }
}
