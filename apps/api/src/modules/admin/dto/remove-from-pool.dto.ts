import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RemoveFromPoolDto {
  @ApiPropertyOptional({ description: 'Why the profile is removed (kept in the audit record, and sent if notifying)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Email the applicant that their profile was removed' })
  @IsOptional()
  @IsBoolean()
  notifyApplicant?: boolean;
}
