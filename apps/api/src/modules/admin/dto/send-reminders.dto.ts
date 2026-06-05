import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendRemindersDto {
  @ApiProperty({ type: [String], description: 'Application UUIDs to send renewal reminders for' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  applicationIds!: string[];
}
