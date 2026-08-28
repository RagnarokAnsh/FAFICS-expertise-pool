import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Shared password rule for every path that sets a password: at least 12
 * characters with one lower-case letter, one upper-case letter and one digit.
 * The 12-character floor matches CreateUserDto so an admin-created password and
 * a self-chosen one are held to the same standard.
 *
 * The upper bound exists because bcrypt silently truncates input beyond 72
 * bytes — without it, two different long passwords could authenticate the same
 * account.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 12 characters and include an uppercase letter, a lowercase letter and a number.';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'officer@fafics.org' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Raw token from the emailed reset link' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Password must be at most 72 characters.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'The password currently in use' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your current password.' })
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Password must be at most 72 characters.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  newPassword!: string;
}
