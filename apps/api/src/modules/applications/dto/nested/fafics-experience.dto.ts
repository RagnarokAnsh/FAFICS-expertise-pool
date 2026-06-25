import {
  IsString,
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
  @IsOptional()
  positionHeld?: string;

  @ApiPropertyOptional({ example: 'FAFICS Standing Committee on Membership; FAFICS Representation — Audit Committee' })
  @IsOptional()
  @IsString()
  areaOfContribution?: string;

  @ApiPropertyOptional({
    example: 'FAFICS Task Force on Digital Outreach',
    description: 'Free text when "Other" is selected for the contribution',
  })
  @IsOptional()
  @IsString()
  areaOfContributionOther?: string;

  @ApiPropertyOptional({ example: 3.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationYears?: number;
}
