import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim, TrimUpper } from '../../../common/transforms/trim';

export class RequestViewLinkDto {
  @ApiProperty({ description: 'The email address associated with the application' })
  @Trim()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'The reference number of the application' })
  @TrimUpper()
  @IsString()
  @IsNotEmpty()
  referenceNumber!: string;
}
