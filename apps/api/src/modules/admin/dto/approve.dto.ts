import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDto {
  @ApiPropertyOptional({ description: 'Optional secretary notes' })
  @IsOptional()
  @IsString()
  secretaryNotes?: string;
}
