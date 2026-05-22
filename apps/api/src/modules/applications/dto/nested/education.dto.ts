import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Education entry (Step 2).
 * An application can have multiple education rows.
 */
export class EducationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'Master of Public Administration' })
  @IsString()
  @IsOptional()
  degreeName?: string;

  @ApiProperty({ example: 'Harvard Kennedy School' })
  @IsString()
  @IsOptional()
  institution?: string;
}
