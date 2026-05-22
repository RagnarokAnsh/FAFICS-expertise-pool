import { IsString, IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Converts empty strings to undefined so @IsOptional() can skip validation. */
const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

/**
 * Association details captured at submission time.
 * President email and phone are mandatory — used for the endorsement magic link.
 */
export class AssociationDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001' })
  @EmptyToUndefined()
  @IsUUID('all')
  @IsOptional()
  associationId?: string;

  @ApiProperty({ example: 'AFICS Geneva' })
  @IsString()
  @IsNotEmpty()
  associationName!: string;

  @ApiProperty({ example: 'Switzerland' })
  @IsString()
  @IsNotEmpty()
  associationCountry!: string;

  @ApiPropertyOptional({ example: 'info@afics-geneva.org' })
  @EmptyToUndefined()
  @IsOptional()
  @IsEmail()
  associationGeneralEmail?: string;

  @ApiProperty({ example: 'president@afics-geneva.org' })
  @IsEmail()
  @IsNotEmpty()
  presidentEmail!: string;

  @ApiProperty({ example: '+41 22 917 5678' })
  @IsString()
  @IsNotEmpty()
  presidentPhone!: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  associateMemberName?: string;

  @ApiPropertyOptional({ example: 'France' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  associateMemberCountry?: string;
}
