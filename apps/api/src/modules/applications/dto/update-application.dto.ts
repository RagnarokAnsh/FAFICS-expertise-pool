import { PartialType } from '@nestjs/swagger';
import { CreateApplicationDto } from './create-application.dto';

/**
 * All fields optional — used for PUT /api/applications/:id (auto-save draft).
 * PartialType makes every property from CreateApplicationDto optional.
 */
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}
