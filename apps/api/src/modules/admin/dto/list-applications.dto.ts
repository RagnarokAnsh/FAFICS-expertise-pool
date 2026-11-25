import { IsOptional, IsInt, IsEnum, IsString, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@fafics/shared';
import { APPLICATION_SORTS, ApplicationSort } from '../application-filters';

export class ListApplicationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 25;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Filter by association country' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Full-text search on name + association' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by expertise area key' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  areaKey?: string;

  @ApiPropertyOptional({ description: 'Filter by association name (exact, any case)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  association?: string;

  @ApiPropertyOptional({ description: 'Only applications awaiting the President for at least this many days' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  waitingMinDays?: number;

  @ApiPropertyOptional({ description: 'Leave out drafts (applications not submitted yet)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  excludeDrafts?: boolean;

  @ApiPropertyOptional({ enum: APPLICATION_SORTS, default: 'updated' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(APPLICATION_SORTS)
  sort?: ApplicationSort;
}
