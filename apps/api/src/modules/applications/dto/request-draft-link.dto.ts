import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDraftLinkDto {
  @ApiProperty({ description: 'The email address associated with the draft application' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
