import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Local association experience entry (Step 3).
 * positionHeld is required.
 */
export class LocalExperienceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'Treasurer' })
  @IsString()
  @IsOptional()
  positionHeld?: string;

  @ApiPropertyOptional({ example: 'Budget Management' })
  @IsOptional()
  @IsString()
  areaOfContribution?: string;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationYears?: number;
}
