import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';
import { UserRole, ApplicationStatus } from '@fafics/shared';

/**
 * DTO for creating an audit log entry.
 * Used by AuditService.log() — the only method exposed.
 */
export class CreateAuditLogDto {
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsString()
  actorEmail!: string;

  @IsEnum(UserRole)
  actorRole!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  oldStatus?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  newStatus?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
