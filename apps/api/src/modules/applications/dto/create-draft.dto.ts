import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PersonalInfoDto } from './nested/personal-info.dto';
import { AssociationDto } from './nested/association.dto';

/**
 * Lean payload used for POST /api/applications (create draft at Step 1).
 * Only contains the required fields for starting a draft.
 */
export class CreateDraftDto {
  @ApiProperty({ type: PersonalInfoDto })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personal!: PersonalInfoDto;

  @ApiProperty({ type: AssociationDto })
  @ValidateNested()
  @Type(() => AssociationDto)
  association!: AssociationDto;
}
