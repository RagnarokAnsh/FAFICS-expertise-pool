import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@fafics/shared';

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ enum: UserRole, description: 'User role' })
  role!: UserRole;
}
