import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpertiseLevel } from '@fafics/shared';

/**
 * Self-assessment expertise entry (Step 4).
 * Each row represents one area of expertise with a proficiency level.
 * Up to 3 areas can be marked as preferred (enforced by DB trigger).
 */
export class ExpertiseDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'governance' })
  @IsString()
  @IsOptional()
  areaKey?: string;

  @ApiProperty({ example: 'Governance & Institutional Management' })
  @IsString()
  @IsOptional()
  areaLabel?: string;

  @ApiPropertyOptional({ enum: ExpertiseLevel, example: ExpertiseLevel.ADVANCED })
  @IsOptional()
  @IsEnum(ExpertiseLevel)
  expertiseLevel?: ExpertiseLevel;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPreferred?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  customIndex?: number;

  @ApiPropertyOptional({
    example: 'Climate Change Policy',
    description: 'Only populated when isCustom = true',
  })
  @IsOptional()
  @IsString()
  otherDescription?: string;
}
