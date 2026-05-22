import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationStatusQueryDto } from './dto/application-status-query.dto';

/**
 * ApplicationsController handles the public-facing application endpoints.
 * No authentication required — these are used by applicants directly.
 *
 * All business logic is delegated to ApplicationsService.
 */
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  private readonly logger = new Logger(ApplicationsController.name);

  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * POST /api/applications
   * Creates a new draft application with all provided data.
   * Returns the application UUID for subsequent updates and submission.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new draft application' })
  @ApiCreatedResponse({ description: 'Draft created', schema: { properties: { id: { type: 'string' } } } })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createDraft(
    @Body() dto: CreateDraftDto,
  ): Promise<{ id: string }> {
    this.logger.log(`Creating draft for ${dto.personal.email}`);
    return this.applicationsService.createDraft(dto);
  }

  /**
   * PUT /api/applications/:id
   * Auto-save endpoint — updates an existing draft with partial data.
   * Only works when application status is 'draft'.
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-save draft (partial update)' })
  @ApiOkResponse({ description: 'Draft saved' })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiBadRequestResponse({ description: 'Application is not a draft' })
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ): Promise<{ message: string }> {
    await this.applicationsService.updateDraft(id, dto);
    return { message: 'Draft saved' };
  }

  /**
   * POST /api/applications/:id/submit
   * Submits a draft application. Generates reference number and UID,
   * sets status to 'submitted', and queues the president email.
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a draft application' })
  @ApiCreatedResponse({
    description: 'Application submitted',
    schema: { properties: { referenceNumber: { type: 'string' } } },
  })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiBadRequestResponse({ description: 'Application is not a draft or missing required fields' })
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitApplicationDto,
  ): Promise<{ referenceNumber: string }> {
    this.logger.log(`Submitting application ${id}`);
    return this.applicationsService.submitApplication(id, dto);
  }

  /**
   * GET /api/applications/status?email=...&referenceNumber=...
   * Applicants check their application status using email + reference number.
   * Returns only status fields — no personal data.
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check application status (email + reference number)' })
  @ApiOkResponse({ description: 'Status retrieved' })
  @ApiNotFoundResponse({ description: 'Application not found' })
  async getStatus(
    @Query() query: ApplicationStatusQueryDto,
  ): Promise<{
    status: string;
    referenceNumber: string;
    submittedAt: Date | null;
    endorsedAt: Date | null;
    approvedAt: Date | null;
  }> {
    return this.applicationsService.getStatus(query);
  }
}
