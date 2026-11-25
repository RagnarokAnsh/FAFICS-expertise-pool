import { OFFICER_ROLES } from '../../auth/roles';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

/**
 * Partial update of an officer account. Every field is optional so the admin UI
 * can send only what changed. The password is deliberately NOT settable here —
 * password changes go through the reset flow so the account owner is always
 * notified by email.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'officer@fafics.org' })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'First name cannot be empty.' })
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Last name cannot be empty.' })
  lastName?: string;

  @ApiPropertyOptional({ enum: OFFICER_ROLES })
  @IsOptional()
  @IsIn(OFFICER_ROLES, {
    message: `role must be one of: ${OFFICER_ROLES.join(', ')}`,
  })
  role?: string;

  @ApiPropertyOptional({ description: 'Deactivating blocks login without deleting the account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
