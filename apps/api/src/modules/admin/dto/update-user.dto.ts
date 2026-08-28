import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ enum: ['secretary', 'committee', 'admin'] })
  @IsOptional()
  @IsEnum(['secretary', 'committee', 'admin'], {
    message: 'role must be one of: secretary, committee, admin',
  })
  role?: string;

  @ApiPropertyOptional({ description: 'Deactivating blocks login without deleting the account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
