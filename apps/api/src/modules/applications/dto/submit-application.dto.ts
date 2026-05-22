import { IsBoolean, Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for the submission trigger POST /api/applications/:id/submit.
 * Both consent fields must be explicitly set to true.
 */
export class SubmitApplicationDto {
  @ApiProperty({ example: true, description: 'Consent to data processing' })
  @IsBoolean()
  @Equals(true, { message: 'You must consent to data processing' })
  consentData!: boolean;

  @ApiProperty({ example: true, description: 'Consent that information is accurate' })
  @IsBoolean()
  @Equals(true, { message: 'You must confirm the information is accurate' })
  consentAccurate!: boolean;
}
