import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'officer@fafics.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12, description: 'Minimum 12 characters' })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({ enum: ['secretary', 'committee', 'admin'] })
  @IsEnum(['secretary', 'committee', 'admin'], {
    message: 'role must be one of: secretary, committee, admin',
  })
  role!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}
