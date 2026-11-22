import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestViewLinkDto {
  @ApiProperty({ description: 'The email address associated with the application' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'The reference number of the application' })
  @IsString()
  @IsNotEmpty()
  referenceNumber!: string;
}
