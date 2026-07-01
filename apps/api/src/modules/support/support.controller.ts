import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';

/**
 * Bridges FAFICS officers into the CIMP support portal. A logged-in officer
 * hits GET /api/support/handoff (their auth cookie rides along on the top-level
 * navigation); we mint a hand-off token and 302-redirect them to the CIMP
 * reporter form. The token never touches the browser as a value — it only ever
 * appears in the redirect URL, which CIMP strips from the address bar on load.
 */
@ApiExcludeController()
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('handoff')
  @UseGuards(JwtAuthGuard)
  async handoff(@Req() req: any, @Res() res: Response): Promise<void> {
    const url = await this.support.handoffUrlForUser(req.user.userId);
    res.redirect(url);
  }
}
