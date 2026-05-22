import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProficiencyLevel } from '@fafics/shared';

/**
 * Language proficiency entry (Step 2).
 * An application can have multiple language rows.
 */
export class LanguageDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiProperty({ example: 'French' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ enum: ProficiencyLevel, example: ProficiencyLevel.PROFICIENT })
  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiency?: ProficiencyLevel;
}
