import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ApplicationStatus, UserRole } from '@fafics/shared';

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

  constructor(private readonly database: DatabaseService) {}

  /**
   * Appends a single audit log entry.
   * @param dto - The audit log data to record
   * @returns void — fire-and-forget; errors are logged but not thrown
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.database.query(
        `
          INSERT INTO audit_logs (
            id,
            application_id,
            actor_id,
            actor_email,
            actor_role,
            action,
            old_status,
            new_status,
            metadata,
            ip_address,
            user_agent,
            created_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW())
        `,
        [
          dto.applicationId ?? null,
          dto.actorId ?? null,
          dto.actorEmail,
          dto.actorRole as UserRole,
          dto.action,
          dto.oldStatus as ApplicationStatus | undefined ?? null,
          dto.newStatus as ApplicationStatus | undefined ?? null,
          dto.metadata ? JSON.stringify(dto.metadata) : null,
          dto.ipAddress ?? null,
          dto.userAgent ?? null,
        ],
      );

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
