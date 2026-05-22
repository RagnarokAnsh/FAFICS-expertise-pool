import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EndorsementService } from './endorsement.service';
import { EndorseDto } from './dto/endorse.dto';
import { ReturnDto } from './dto/return.dto';

@Controller('endorse')
export class EndorsementController {
  constructor(private readonly endorsementService: EndorsementService) {}

  @Get(':token')
  async getApplicationView(@Param('token') token: string) {
    return this.endorsementService.validateAndGetApplication(token);
  }

  @Post(':token/endorse')
  async endorseApplication(
    @Param('token') token: string,
    @Body() dto: EndorseDto,
  ) {
    return this.endorsementService.endorse(token, dto);
  }

  @Post(':token/return')
  async returnApplication(
    @Param('token') token: string,
    @Body() dto: ReturnDto,
  ) {
    return this.endorsementService.returnApplication(token, dto);
  }
}
