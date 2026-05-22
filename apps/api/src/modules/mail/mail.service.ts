import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { submissionConfirmationTemplate } from './templates/submission-confirmation.template';
import { presidentReviewTemplate } from './templates/president-review.template';
import { presidentLinkExpiredTemplate } from './templates/president-link-expired.template';
import { changesRequestedTemplate } from './templates/changes-requested.template';
import { endorsedTemplate } from './templates/endorsed.template';
import { secretaryReviewPendingTemplate } from './templates/secretary-review-pending.template';
import { approvedTemplate } from './templates/approved.template';
import { rejectedTemplate } from './templates/rejected.template';
import { renewalReminderTemplate } from './templates/renewal-reminder.template';
import { expiredTemplate } from './templates/expired.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private resend!: Resend;
  private isProd: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
    
    if (this.isProd) {
      this.resend = new Resend(this.configService.get<string>('mail.resendApiKey'));
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.smtpHost', 'localhost'),
        port: this.configService.get<number>('mail.smtpPort', 1025),
        ignoreTLS: true,
      });
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<{ messageId: string }> {
    const from = this.configService.get<string>('mail.fromEmail', 'noreply@fafics.org');

    if (this.isProd) {
      const result = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { messageId: result.data!.id };
    } else {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      return { messageId: info.messageId };
    }
  }

  private getWebBaseUrl(): string {
    return this.configService.get<string>('app.webBaseUrl') || this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
  }

  async sendSubmissionConfirmation(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = submissionConfirmationTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendPresidentReviewRequest(applicationId: string, magicLinkUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = presidentReviewTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      associationName: app.associationName,
      submissionDate: app.submittedAt!,
      magicLinkUrl,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  async sendPresidentLinkExpired(applicationId: string, magicLinkUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = presidentLinkExpiredTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      magicLinkUrl,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  async sendChangesRequested(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    
    // Determine the reviewer name based on who left the most recent notes, or status context
    let reviewerName = 'FAFICS Secretary';
    let notes = app.secretaryNotes || '';

    // If it was returned by president (status changed to changes_requested from submitted)
    // Actually in Phase 2 it's mostly President. For now we use President or Secretary depending on notes presence.
    // Let's assume if it has presidentNotes, we use that for the template if it's currently at president stage.
    // For simplicity, we just use the most recently updated notes. In EndorsementModule, presidentNotes are updated.
    
    // Better logic: if president returned it, presidentNotes will be present and secretary hasn't seen it yet.
    if (app.presidentNotes && !app.secretaryNotes) {
      reviewerName = `President of ${app.associationName}`;
      notes = app.presidentNotes;
    } else if (app.secretaryNotes) {
      notes = app.secretaryNotes;
    }

    const { subject, html } = changesRequestedTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      reviewerName,
      reviewerNotes: notes,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendEndorsed(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
    });
    
    const presidentName = `the President of ${app.associationName}`;
    
    const { subject, html } = endorsedTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      presidentName,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendSecretaryReviewPending(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = secretaryReviewPendingTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      associationName: app.associationName,
      applicationId: app.id,
      webBaseUrl: this.getWebBaseUrl(),
    });
    const secEmail = this.configService.get<string>('mail.secretaryEmail', 'secretary@fafics.org');
    return this.sendEmail(secEmail, subject, html);
  }

  async sendApproved(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { expertise: true },
    });
    const approvedAreas = app.expertise.map(exp => exp.isCustom && exp.otherDescription ? exp.otherDescription : exp.areaLabel);
    
    const { subject, html } = approvedTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      expiryDate: app.expiresAt!,
      approvedAreas,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendRejected(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = rejectedTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      secretaryNotes: app.secretaryNotes || undefined,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendRenewalReminder(applicationId: string, daysLeft: 90 | 30): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = renewalReminderTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      daysLeft,
      expiryDate: app.expiresAt!,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendExpired(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = expiredTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }
}
