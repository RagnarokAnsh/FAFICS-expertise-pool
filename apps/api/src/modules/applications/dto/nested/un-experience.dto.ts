import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UN System work experience entry (Step 3).
 * Agency and positionTitle are required.
 */
export class UnExperienceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'WHO' })
  @IsString()
  @IsOptional()
  agency?: string;

  @ApiProperty({ example: 'Senior Programme Officer' })
  @IsString()
  @IsOptional()
  positionTitle?: string;

  @ApiPropertyOptional({ example: 'P-5' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ example: 'Health Policy' })
  @IsOptional()
  @IsString()
  areaOfExpertise?: string;

  @ApiPropertyOptional({ example: 15.0, description: 'Duration in years (0.5 min)' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationYears?: number;
}
