import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectDto {
  @ApiProperty({ description: 'Reason for rejection (required)' })
  @IsNotEmpty()
  @IsString()
  secretaryNotes!: string;
}
