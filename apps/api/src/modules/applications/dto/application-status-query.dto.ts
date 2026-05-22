import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Query DTO for GET /api/applications/status.
 * Applicants check their status using their email + reference number.
 */
export class ApplicationStatusQueryDto {
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'EP-0001' })
  @IsString()
  @IsNotEmpty()
  referenceNumber!: string;
}
