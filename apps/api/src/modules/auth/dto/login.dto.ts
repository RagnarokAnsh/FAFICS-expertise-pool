import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@fafics.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'changeme123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
