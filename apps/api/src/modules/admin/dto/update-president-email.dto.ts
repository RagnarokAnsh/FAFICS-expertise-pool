import { IsEmail, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePresidentEmailDto {
  @ApiProperty({ example: 'president@afics-geneva.org', description: "Corrected President's email" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'Invalid email' })
  @MaxLength(255)
  presidentEmail!: string;
}
