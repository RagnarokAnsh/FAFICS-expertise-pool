import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** The profiles to export, e.g. the filtered list on the Expertise Pool page. */
export class ExportRosterDto {
  @ApiProperty({ type: [String], description: 'Application ids to include' })
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  ids!: string[];
}
