import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * FAFICS-level experience entry (Step 3).
 * positionHeld is required.
 */
export class FaficsExperienceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'Council Member' })
  @IsString()
  @IsNotEmpty()
  positionHeld!: string;

  @ApiPropertyOptional({ example: 'Governance' })
  @IsOptional()
  @IsString()
  areaOfContribution?: string;

  @ApiPropertyOptional({ example: 3.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationYears?: number;
}
