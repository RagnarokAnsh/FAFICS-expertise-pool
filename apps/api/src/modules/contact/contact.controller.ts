import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { MailService } from '../mail/mail.service';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {

  private readonly logger =
    new Logger(ContactController.name);

  constructor(
    private readonly mailService: MailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // each message sends an email
  async sendContact(@Body() dto: ContactDto) {
    try {
      await this.mailService.sendContactUsEmail(
        dto.email.trim(),
        dto.message.trim(),
      );

      return {
        success: true,
        message: 'Your message has been sent successfully.',
      };

    } catch (error) {
      this.logger.error('Contact email sending failed', error);

      throw new InternalServerErrorException(
        'Unable to send your message. Please try again.',
      );
    }
  }
}