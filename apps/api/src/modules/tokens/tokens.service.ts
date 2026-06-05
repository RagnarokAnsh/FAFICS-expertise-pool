import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenPurpose } from '@fafics/shared';
import * as crypto from 'crypto';
import { MagicToken } from '@prisma/client';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

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

    await this.prisma.magicToken.create({
      data: {
        // Only the SHA-256 hash is persisted — the raw token is never stored,
        // so a database leak cannot reveal live magic links.
        tokenHash,
        purpose: params.purpose as any, // Cast to Prisma enum if needed
        applicationId: params.applicationId,
        userId: params.userId,
        recipientEmail: params.recipientEmail,
        expiresAt,
      },
    });

    return { rawToken, tokenHash };
  }

  async validate(rawToken: string, markUsed: boolean = true): Promise<MagicToken> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    const magicToken = await this.prisma.magicToken.findUnique({
      where: { tokenHash },
    });

    if (!magicToken) {
      throw new NotFoundException('Invalid or expired link');
    }

    if (markUsed && magicToken.usedAt !== null) {
      throw new GoneException('This link has already been used');
    }

    if (magicToken.expiresAt.getTime() < Date.now()) {
      throw new GoneException('This link has expired');
    }

    if (markUsed) {
      const updatedToken = await this.prisma.magicToken.update({
        where: { id: magicToken.id },
        data: { usedAt: new Date() },
      });
      return updatedToken;
    }

    return magicToken;
  }

  async invalidateForApplication(applicationId: string, purpose: TokenPurpose): Promise<void> {
    await this.prisma.magicToken.updateMany({
      where: {
        applicationId,
        purpose: purpose as any,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  /**
   * Validates a token without marking it as used.
   * Use this for read-only operations (e.g., viewing application data).
   * The token remains valid for a subsequent validate() call.
   */
  async peek(rawToken: string): Promise<MagicToken> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const magicToken = await this.prisma.magicToken.findUnique({
      where: { tokenHash },
    });

    if (!magicToken) {
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
