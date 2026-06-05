import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  Headers,
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
import { Throttle } from '@nestjs/throttler';
import { ApplicationsService } from './applications.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationStatusQueryDto } from './dto/application-status-query.dto';
import { RequestEditLinkDto } from './dto/request-edit-link.dto';
import { RequestDraftLinkDto } from './dto/request-draft-link.dto';

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

  /**
   * POST /api/applications/request-edit-link
   * Requests an editing link for an application in draft or changes_requested status.
   */
  @Post('request-edit-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // limit email sends per IP
  @ApiOperation({ summary: 'Request an editing link for an application' })
  @ApiOkResponse({ description: 'Edit link sent' })
  @ApiNotFoundResponse({ description: 'Application not found' })
  async requestEditLink(@Body() dto: RequestEditLinkDto): Promise<{ message: string }> {
    return this.applicationsService.requestEditLink(dto);
  }

  /**
   * POST /api/applications/request-draft-link
   * Requests a resume link for a draft application (email only, no reference number).
   * Always returns 200 regardless of whether a draft exists (prevents email enumeration).
   */
  @Post('request-draft-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // limit email sends per IP
  @ApiOperation({ summary: 'Request a draft resume link (email only)' })
  @ApiOkResponse({ description: 'If a draft exists, a link has been sent' })
  async requestDraftLink(@Body() dto: RequestDraftLinkDto): Promise<{ message: string }> {
    await this.applicationsService.requestDraftLink(dto.email);
    return { message: 'If a draft application exists for this email, a resume link has been sent.' };
  }

  /**
   * GET /api/applications/resume/:token
   * Resumes an application from a magic link token.
   */
  @Get('resume/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume application from edit token' })
  @ApiOkResponse({ description: 'Application data retrieved' })
  @ApiNotFoundResponse({ description: 'Link invalid or expired' })
  async resumeFromToken(@Param('token') token: string): Promise<any> {
    return this.applicationsService.resumeFromToken(token);
  }

  /**
   * POST /api/applications
   * Creates a new draft application with all provided data.
   * Returns the application UUID for subsequent updates and submission.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new draft application' })
  @ApiCreatedResponse({ description: 'Draft created or existing draft resumed', schema: { properties: { id: { type: 'string' }, editToken: { type: 'string' }, resumed: { type: 'boolean' } } } })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createDraft(
    @Body() dto: CreateDraftDto,
  ): Promise<{ id: string; editToken: string; resumed: boolean }> {
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
    @Headers('x-edit-token') editToken?: string,
  ): Promise<{ message: string }> {
    await this.applicationsService.updateDraft(id, dto, editToken);
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
    @Headers('x-edit-token') editToken?: string,
  ): Promise<{ referenceNumber: string }> {
    this.logger.log(`Submitting application ${id}`);
    return this.applicationsService.submitApplication(id, dto, editToken);
  }
}
