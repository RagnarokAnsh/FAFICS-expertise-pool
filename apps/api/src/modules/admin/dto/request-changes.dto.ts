import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestChangesDto {
  @ApiProperty({ description: 'Notes describing the changes requested (required)' })
  @IsNotEmpty()
  @IsString()
  secretaryNotes!: string;
}
