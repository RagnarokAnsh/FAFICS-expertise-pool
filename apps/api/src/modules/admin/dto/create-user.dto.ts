import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../auth/dto/password.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'officer@fafics.org' })
  @IsEmail()
  email!: string;

  // Same rule as the reset and change-password flows, so an account created by
  // an administrator is never weaker than one the owner sets themselves.
  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, description: PASSWORD_RULE_MESSAGE })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Password must be at most 72 characters.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  password!: string;

  @ApiProperty({ enum: ['secretary', 'committee', 'admin'] })
  @IsEnum(['secretary', 'committee', 'admin'], {
    message: 'role must be one of: secretary, committee, admin',
  })
  role!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}
