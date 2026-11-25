import { IsIn } from 'class-validator';
import { OFFICER_ROLES } from '../../auth/roles';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: OFFICER_ROLES })
  @IsIn(OFFICER_ROLES, {
    message: `role must be one of: ${OFFICER_ROLES.join(', ')}`,
  })
  role!: string;
}
