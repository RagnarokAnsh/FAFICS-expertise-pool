import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['secretary', 'committee', 'admin'] })
  @IsEnum(['secretary', 'committee', 'admin'], {
    message: 'role must be one of: secretary, committee, admin',
  })
  role!: string;
}
