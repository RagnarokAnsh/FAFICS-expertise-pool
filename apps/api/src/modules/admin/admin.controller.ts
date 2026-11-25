import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ExportService } from '../export/export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ADMIN_ROLES,
  EXPIRING_VIEW_ROLES,
  EXPORT_ROLES,
  REVIEW_ROLES,
  VIEW_ROLES,
} from '../auth/roles';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { RemoveFromPoolDto } from './dto/remove-from-pool.dto';
import { ExportRosterDto } from './dto/export-roster.dto';
import { applicationsOrderBy, applicationsWhere } from './application-filters';
import { RequestChangesDto } from './dto/request-changes.dto';
import { AddNotesDto } from './dto/add-notes.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SendRemindersDto } from './dto/send-reminders.dto';
import { UpdatePresidentEmailDto } from './dto/update-president-email.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exportService: ExportService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get reporting analytics for approved profiles' })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('associations')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Distinct associations for filter dropdowns' })
  async getDistinctAssociations() {
    return this.adminService.getDistinctAssociations();
  }

  @Get('countries')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get distinct association countries for filter dropdowns' })
  @ApiResponse({ status: 200, description: 'List of distinct countries' })
  async getDistinctCountries() {
    return this.adminService.getDistinctCountries();
  }

  // ─── Applications ──────────────────────────────────────────────────────

  @Get('applications')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List applications with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated application list' })
  async listApplications(@Query() query: ListApplicationsDto) {
    return this.adminService.listApplications(query);
  }

  @Get('applications/:id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get full application detail' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Full application detail with audit log' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getApplicationDetail(id);
  }

  @Patch('applications/:id/approve')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Application approved' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.approve(id, dto, actor);
    return { message: 'Application approved successfully' };
  }

  @Post('applications/:id/remove-from-pool')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an approved profile from the pool (deletes its data)' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Profile removed' })
  async removeFromPool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemoveFromPoolDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    const { referenceNumber } = await this.adminService.removeFromPool(id, dto, actorEmail);
    return { message: `${referenceNumber ?? 'The profile'} was removed from the Expertise Pool.` };
  }

  @Patch('applications/:id/reject')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.reject(id, dto, actor);
    return { message: 'Application rejected' };
  }

  @Patch('applications/:id/request-changes')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request changes on an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Changes requested' })
  async requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.requestChanges(id, dto, actor);
    return { message: 'Changes requested' };
  }

  @Patch('applications/:id/notes')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add internal notes to an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Notes added' })
  async addNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNotesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.addNotes(id, dto, actor);
    return { message: 'Notes added' };
  }

  @Post('applications/:id/resend-president-link')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email the President the endorsement request again (earlier links keep working)' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Endorsement email sent' })
  @ApiResponse({ status: 400, description: 'Application is not awaiting the President' })
  @ApiResponse({ status: 503, description: 'The email could not be sent' })
  async resendPresidentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('role') actorRole: string,
  ) {
    const { presidentEmail } = await this.adminService.resendPresidentLink(id, actorEmail, actorRole);
    return { presidentEmail, message: `Endorsement email sent to ${presidentEmail}` };
  }

  @Patch('applications/:id/president-email')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Correct the President's email; while awaiting the President, a new link is sent to it",
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'President email updated' })
  async updatePresidentEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePresidentEmailDto,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('role') actorRole: string,
  ) {
    return this.adminService.updatePresidentEmail(id, dto.presidentEmail, actorEmail, actorRole);
  }

  // ─── Export ────────────────────────────────────────────────────────────

  @Get('export/roster')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'Download the whole Expertise Pool as an Excel file' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportRoster(@Res() res: Response) {
    const buffer = await this.exportService.generateRosterExcel();
    this.sendExcel(res, buffer, `FAFICS_Expertise_Pool_${this.today()}.xlsx`);
  }

  @Post('export/roster')
  @Roles(...EXPORT_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download selected Expertise Pool profiles as an Excel file' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportRosterSelection(@Body() dto: ExportRosterDto, @Res() res: Response) {
    const buffer = await this.exportService.generateRosterExcel(dto.ids);
    this.sendExcel(res, buffer, `FAFICS_Expertise_Pool_${this.today()}.xlsx`);
  }

  @Get('export/applications')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'Download applications (any status) as Excel, with the Applications page filters' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportApplications(@Query() dto: ListApplicationsDto, @Res() res: Response) {
    const buffer = await this.exportService.generateApplicationsExcel(
      applicationsWhere(dto),
      applicationsOrderBy(dto.sort),
    );
    this.sendExcel(res, buffer, `FAFICS_Applications_${this.today()}.xlsx`);
  }

  @Get('export/application/:id')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'Download one application as an Excel file' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportApplication(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, referenceNumber } = await this.exportService.generateSingleApplicationExcel(id);
    this.sendExcel(res, buffer, `FAFICS_Profile_${referenceNumber ?? 'Draft'}_${this.today()}.xlsx`);
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private sendExcel(res: Response, buffer: Buffer, filename: string): void {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── Expiring Profiles ─────────────────────────────────────────────────

  @Get('expiring')
  @Roles(...EXPIRING_VIEW_ROLES)
  @ApiOperation({ summary: 'List applications expiring within 90 days' })
  @ApiResponse({ status: 200, description: 'List of expiring applications' })
  async getExpiring() {
    return this.adminService.getExpiring(90);
  }

  @Post('reminders/send')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk send renewal reminders' })
  @ApiResponse({ status: 200, description: 'Reminders queued' })
  async sendReminders(@Body() body: SendRemindersDto) {
    return this.adminService.sendRenewalReminders(body.applicationIds);
  }

  // ─── User Management ──────────────────────────────────────────────────

  @Get('users')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List all officer users' })
  @ApiResponse({ status: 200, description: 'List of officers' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create a new officer user' })
  @ApiResponse({ status: 201, description: 'Officer created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.createUser(dto, actor);
  }

  @Patch('users/:id/role')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.updateUserRole(id, body.role, actor);
    return { message: 'Role updated' };
  }

  @Patch('users/:id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an officer profile, role, or active state' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    await this.adminService.updateUser(id, dto, actorEmail, actorId);
    return { message: 'User updated' };
  }

  @Delete('users/:id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an officer account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({
    status: 400,
    description: 'Blocked - owns applications, presides an association, is self, or is the last admin',
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    await this.adminService.deleteUser(id, actorEmail, actorId);
    return { message: 'User deleted' };
  }

  @Post('users/:id/reset-password')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a password reset link to an officer' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Reset link sent' })
  async sendUserPasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    const { email } = await this.adminService.sendUserPasswordReset(id, actorEmail, actorId);
    return { message: `Password reset link sent to ${email}` };
  }

  // ─── Notification Logs ────────────────────────────────────────────────

  @Get('notifications')
  @Roles(...REVIEW_ROLES)
  @ApiOperation({ summary: 'List notification logs' })
  @ApiResponse({ status: 200, description: 'Paginated notification log list' })
  async listNotifications(@Query() query: ListNotificationsDto) {
    return this.adminService.listNotifications({
      applicationId: query.applicationId,
      failedOnly: query.failedOnly === true,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('notifications/:id/retry')
  @Roles(...REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed notification' })
  @ApiParam({ name: 'id', description: 'Notification log UUID' })
  @ApiResponse({ status: 200, description: 'Notification retried' })
  async retryNotification(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.retryNotification(id);
  }
}
