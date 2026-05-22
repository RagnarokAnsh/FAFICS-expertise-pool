import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Converts empty strings to undefined so @IsOptional() can skip validation. */
const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

/**
 * Personal information fields for the application form (Step 1).
 * All required fields have @IsOptional(). Optional fields have @IsOptional().
 */
export class PersonalInfoDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pierre' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '1960-03-15' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: 'French' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: 'Swiss' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  secondNationality?: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: '+41 22 917 1234' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+41 79 123 4567' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '2020-06-30' })
  @IsDateString()
  @IsOptional()
  separationDate?: string;
}
