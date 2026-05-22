import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonalInfoDto } from './nested/personal-info.dto';
import { AssociationDto } from './nested/association.dto';
import { EducationDto } from './nested/education.dto';
import { LanguageDto } from './nested/language.dto';
import { UnExperienceDto } from './nested/un-experience.dto';
import { NonUnExperienceDto } from './nested/nonun-experience.dto';
import { FaficsExperienceDto } from './nested/fafics-experience.dto';
import { LocalExperienceDto } from './nested/local-experience.dto';
import { ExpertiseDto } from './nested/expertise.dto';

/**
 * Full application payload composed from all nested DTOs.
 * Used for POST /api/applications (create draft).
 * All child arrays use @ValidateNested with @Type for deep validation.
 */
export class CreateApplicationDto {
  @ApiProperty({ type: PersonalInfoDto })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personal!: PersonalInfoDto;

  @ApiProperty({ type: AssociationDto })
  @ValidateNested()
  @Type(() => AssociationDto)
  association!: AssociationDto;

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations?: EducationDto[];

  @ApiPropertyOptional({ type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({ type: [UnExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnExperienceDto)
  unExperiences?: UnExperienceDto[];

  @ApiPropertyOptional({ type: [NonUnExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NonUnExperienceDto)
  nonUnExperiences?: NonUnExperienceDto[];

  @ApiPropertyOptional({ type: [FaficsExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaficsExperienceDto)
  faficsExperiences?: FaficsExperienceDto[];

  @ApiPropertyOptional({ type: [LocalExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalExperienceDto)
  localExperiences?: LocalExperienceDto[];

  @ApiPropertyOptional({ type: [ExpertiseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertiseDto)
  expertise?: ExpertiseDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unExperienceSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonUnExperienceSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faficsExperienceSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localExperienceSummary?: string;
}
