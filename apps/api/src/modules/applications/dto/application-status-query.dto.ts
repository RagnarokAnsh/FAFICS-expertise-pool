import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim, TrimUpper } from '../../../common/transforms/trim';

/**
 * Query DTO for GET /api/applications/status.
 * Applicants check their status using their email + reference number.
 */
export class ApplicationStatusQueryDto {
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @Trim()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'EP-0001' })
  @TrimUpper()
  @IsString()
  @IsNotEmpty()
  referenceNumber!: string;
}
