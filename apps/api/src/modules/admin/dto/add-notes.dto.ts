import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddNotesDto {
  @ApiProperty({ description: 'Internal secretary notes (required)' })
  @IsNotEmpty()
  @IsString()
  secretaryNotes!: string;
}
