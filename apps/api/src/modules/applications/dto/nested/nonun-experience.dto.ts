import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Non-UN work experience entry (Step 3).
 * Organization and positionTitle are required.
 */
export class NonUnExperienceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'Red Cross' })
  @IsString()
  @IsOptional()
  organization?: string;

  @ApiProperty({ example: 'Regional Director' })
  @IsString()
  @IsOptional()
  positionTitle?: string;

  @ApiPropertyOptional({ example: 'Humanitarian Affairs' })
  @IsOptional()
  @IsString()
  areaOfExpertise?: string;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationYears?: number;
}
