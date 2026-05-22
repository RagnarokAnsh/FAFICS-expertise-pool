import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response from GET /api/applications/status.
 * Returns only status information — no personal data exposed.
 */
export class ApplicationStatusResponse {
  @ApiProperty({ example: 'submitted' })
  status!: string;

  @ApiProperty({ example: 'EP-0001' })
  referenceNumber!: string;

  @ApiPropertyOptional({ example: '2026-05-21T10:00:00.000Z' })
  submittedAt!: string | null;

  @ApiPropertyOptional({ example: null })
  endorsedAt!: string | null;

  @ApiPropertyOptional({ example: null })
  approvedAt!: string | null;
}
