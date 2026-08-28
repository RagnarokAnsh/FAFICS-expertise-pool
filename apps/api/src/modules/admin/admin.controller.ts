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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { AddNotesDto } from './dto/add-notes.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SendRemindersDto } from './dto/send-reminders.dto';

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
  @Roles('secretary', 'committee', 'admin')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  @Roles('secretary', 'committee', 'admin')
  @ApiOperation({ summary: 'Get reporting analytics for approved profiles' })
  @ApiResponse({ status: 200, description: 'Analytics data returned' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('countries')
  @Roles('secretary', 'committee', 'admin')
  @ApiOperation({ summary: 'Get distinct association countries for filter dropdowns' })
  @ApiResponse({ status: 200, description: 'List of distinct countries' })
  async getDistinctCountries() {
    return this.adminService.getDistinctCountries();
  }

  // ─── Applications ──────────────────────────────────────────────────────

  @Get('applications')
  @Roles('secretary', 'committee', 'admin')
  @ApiOperation({ summary: 'List applications with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated application list' })
  async listApplications(@Query() query: ListApplicationsDto) {
    return this.adminService.listApplications(query);
  }

  @Get('applications/:id')
  @Roles('secretary', 'committee', 'admin')
  @ApiOperation({ summary: 'Get full application detail' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Full application detail with audit log' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationDetail(@Param('id') id: string) {
    return this.adminService.getApplicationDetail(id);
  }

  @Patch('applications/:id/approve')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Application approved' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    await this.adminService.approve(id, dto, actorEmail);
    return { message: 'Application approved successfully' };
  }

  @Patch('applications/:id/reject')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    await this.adminService.reject(id, dto, actorEmail);
    return { message: 'Application rejected' };
  }

  @Patch('applications/:id/request-changes')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request changes on an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Changes requested' })
  async requestChanges(
    @Param('id') id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    await this.adminService.requestChanges(id, dto, actorEmail);
    return { message: 'Changes requested' };
  }

  @Patch('applications/:id/notes')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add internal notes to an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Notes added' })
  async addNotes(
    @Param('id') id: string,
    @Body() dto: AddNotesDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    await this.adminService.addNotes(id, dto, actorEmail);
    return { message: 'Notes added' };
  }

  // ─── Export ────────────────────────────────────────────────────────────

  @Get('export/roster')
  @Roles('secretary', 'admin')
  @ApiOperation({ summary: 'Download full Expertise Pool as Excel file' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportRoster(@Res() res: Response) {
    const buffer = await this.exportService.generateRosterExcel();
    const date = new Date().toISOString().split('T')[0];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fafics-expertise-pool-${date}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('export/application/:id')
  @Roles('secretary', 'admin')
  @ApiOperation({ summary: 'Download single application as Excel file' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportApplication(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportService.generateSingleApplicationExcel(id);
    const date = new Date().toISOString().split('T')[0];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fafics-application-${id.slice(0, 8)}-${date}.xlsx"`,
    );
    res.send(buffer);
  }

  // ─── Expiring Profiles ─────────────────────────────────────────────────

  @Get('expiring')
  @Roles('secretary', 'admin')
  @ApiOperation({ summary: 'List applications expiring within 90 days' })
  @ApiResponse({ status: 200, description: 'List of expiring applications' })
  async getExpiring() {
    return this.adminService.getExpiring(90);
  }

  @Post('reminders/send')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk send renewal reminders' })
  @ApiResponse({ status: 200, description: 'Reminders queued' })
  async sendReminders(@Body() body: SendRemindersDto) {
    return this.adminService.sendRenewalReminders(body.applicationIds);
  }

  // ─── User Management ──────────────────────────────────────────────────

  @Get('users')
  @Roles('admin')
  @ApiOperation({ summary: 'List all officer users' })
  @ApiResponse({ status: 200, description: 'List of officers' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new officer user' })
  @ApiResponse({ status: 201, description: 'Officer created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    return this.adminService.createUser(dto, actorEmail);
  }

  @Patch('users/:id/role')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
    @CurrentUser('email') actorEmail: string,
  ) {
    await this.adminService.updateUserRole(id, body.role, actorEmail);
    return { message: 'Role updated' };
  }

  @Patch('users/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an officer profile, role, or active state' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    await this.adminService.updateUser(id, dto, actorEmail, actorId);
    return { message: 'User updated' };
  }

  @Delete('users/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an officer account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({
    status: 400,
    description: 'Blocked - owns applications, presides an association, is self, or is the last admin',
  })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    await this.adminService.deleteUser(id, actorEmail, actorId);
    return { message: 'User deleted' };
  }

  @Post('users/:id/reset-password')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a password reset link to an officer' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Reset link sent' })
  async sendUserPasswordReset(
    @Param('id') id: string,
    @CurrentUser('email') actorEmail: string,
    @CurrentUser('userId') actorId: string,
  ) {
    const { email } = await this.adminService.sendUserPasswordReset(id, actorEmail, actorId);
    return { message: `Password reset link sent to ${email}` };
  }

  // ─── Notification Logs ────────────────────────────────────────────────

  @Get('notifications')
  @Roles('secretary', 'admin')
  @ApiOperation({ summary: 'List notification logs' })
  @ApiResponse({ status: 200, description: 'Paginated notification log list' })
  async listNotifications(
    @Query('applicationId') applicationId?: string,
    @Query('failedOnly') failedOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listNotifications({
      applicationId,
      failedOnly: failedOnly === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('notifications/:id/retry')
  @Roles('secretary', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed notification' })
  @ApiParam({ name: 'id', description: 'Notification log UUID' })
  @ApiResponse({ status: 200, description: 'Notification retried' })
  async retryNotification(@Param('id') id: string) {
    return this.adminService.retryNotification(id);
  }
}
