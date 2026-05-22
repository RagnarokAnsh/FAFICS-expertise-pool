import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ApplicationStatus, UserRole, Prisma } from '@prisma/client';

/**
 * AuditService is append-only. It exposes only one method: log().
 * There are no update or delete methods — audit logs are immutable.
 *
 * Every status change, president action, and secretary action must
 * call this service to write an audit log entry.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends a single audit log entry.
   * @param dto - The audit log data to record
   * @returns void — fire-and-forget; errors are logged but not thrown
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          applicationId: dto.applicationId,
          actorId: dto.actorId,
          actorEmail: dto.actorEmail,
          actorRole: dto.actorRole as UserRole,
          action: dto.action,
          oldStatus: dto.oldStatus as ApplicationStatus | undefined,
          newStatus: dto.newStatus as ApplicationStatus | undefined,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });

      this.logger.log(
        `Audit: ${dto.action} by ${dto.actorEmail} (${dto.actorRole})` +
          (dto.applicationId ? ` on application ${dto.applicationId}` : ''),
      );
    } catch (error) {
      // Audit logging failures must not crash the request.
      // Log the error but do not re-throw.
      this.logger.error(
        `Failed to write audit log: ${dto.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
