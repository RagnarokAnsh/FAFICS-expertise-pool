import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../common/transforms/trim';

export class RequestDraftLinkDto {
  @ApiProperty({ description: 'The email address associated with the draft application' })
  @Trim()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
