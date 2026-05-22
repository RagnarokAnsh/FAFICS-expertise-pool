import { ApiProperty } from '@nestjs/swagger';

/**
 * Response from POST /api/applications/:id/submit.
 */
export class ApplicationSubmittedResponse {
  @ApiProperty({ example: 'EP-0001' })
  referenceNumber!: string;
}
