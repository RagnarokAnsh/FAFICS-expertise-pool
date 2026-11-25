import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDisplayDateTime } from '../../common/utils/display-date';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { submissionConfirmationTemplate } from './templates/submission-confirmation.template';
import { presidentReviewTemplate } from './templates/president-review.template';
import { presidentLinkExpiredTemplate } from './templates/president-link-expired.template';
import { presidentReminderTemplate } from './templates/president-reminder.template';
import { changesRequestedTemplate } from './templates/changes-requested.template';
import { endorsedTemplate } from './templates/endorsed.template';
import { approvedTemplate } from './templates/approved.template';
import { rejectedTemplate } from './templates/rejected.template';
import { renewalReminderTemplate } from './templates/renewal-reminder.template';
import { expiredTemplate } from './templates/expired.template';
import { applicantEditLinkTemplate } from './templates/applicant-edit-link.template';
import { applicantViewLinkTemplate } from './templates/applicant-view-link.template';
import { applicantReminderNoticeTemplate } from './templates/applicant-reminder-notice.template';
import { removedFromPoolTemplate } from './templates/removed-from-pool.template';
import { draftSavedTemplate } from './templates/draft-saved.template';
import { passwordResetTemplate } from './templates/password-reset.template';
import { passwordChangedTemplate } from './templates/password-changed.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private resend!: Resend;
  private useResend: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Use Resend only when a REAL API key is configured; otherwise fall back to
    // SMTP (Gmail in production, Mailhog locally). The Joi default (`re_test`)
    // and the `.env.example` placeholder (`re_xxxxxxxxxxxx`) must count as "no
    // real key" — otherwise a copied example silently routes every send to
    // Resend and fails with "API key is invalid". A real key starts with `re_`
    // and never contains the `xxxx` placeholder run.
    const resendApiKey = this.configService.get<string>('mail.resendApiKey');
    this.useResend =
      !!resendApiKey &&
      resendApiKey.startsWith('re_') &&
      resendApiKey !== 're_test' &&
      !resendApiKey.includes('xxxx');

    if (this.useResend) {
      this.resend = new Resend(resendApiKey);
    } else {
      const smtpPort = this.configService.get<number>('mail.smtpPort', 587);
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.smtpHost', 'smtp.gmail.com'),
        port: smtpPort,
        secure: smtpPort === 465, // 465 = implicit TLS; 587 = STARTTLS
        requireTLS: smtpPort === 587,
        auth: {
          user: this.configService.get<string>('mail.smtpUser'),
          pass: this.configService.get<string>('mail.smtpPass'),
        },
      });
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<{ messageId: string }> {
    const from = this.configService.get<string>('mail.fromEmail', 'noreply@fafics.org');

    if (this.useResend) {
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
        // Force base64 for the HTML body. The default quoted-printable encoding
        // soft-wraps lines at column 76, which can land mid-URL and split a
        // 64-char magic-link token across a `=\r\n` break. Fragile decode paths
        // (e.g. a browser stripping the newline but keeping the stray `=`)
        // then corrupt the token, so the endorsement link 404s as "expired".
        // base64 wraps on its own boundaries and is decoded intact by clients.
        textEncoding: 'base64',
      });
      return { messageId: info.messageId };
    }
  }

  private getWebBaseUrl(): string {
    const base = this.configService.get<string>('app.webBaseUrl') || this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    // Links are built by concatenation — a trailing slash would produce
    // "http://host//path" in every email.
    return base.replace(/\/+$/, '');
  }

  async sendSubmissionConfirmation(
    applicationId: string,
    viewUrl: string,
    viewLinkValidFor: string,
  ): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = submissionConfirmationTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      viewUrl,
      viewLinkValidFor,
      statusUrl: `${this.getWebBaseUrl()}/status`,
    });
    return this.sendEmail(app.email, subject, html);
  }

  /** A fresh read-only link to the applicant's submitted application. */
  async sendApplicantViewLink(
    applicationId: string,
    viewUrl: string,
    validFor: string,
  ): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = applicantViewLinkTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      referenceNumber: app.referenceNumber!,
      viewUrl,
      validFor,
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
      preferredCommittees: app.preferredCommittees,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  async sendPresidentReminder(applicationId: string, magicLinkUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = presidentReminderTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      associationName: app.associationName,
      submissionDate: app.submittedAt!,
      magicLinkUrl,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  /** Tells the applicant their President was reminded. No endorsement link. */
  async sendApplicantReminderNotice(
    applicationId: string,
    viewUrl: string,
    viewLinkValidFor: string,
    daysAfterSubmission?: number,
  ): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = applicantReminderNoticeTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      referenceNumber: app.referenceNumber!,
      associationName: app.associationName,
      presidentEmail: app.presidentEmail,
      submissionDate: app.submittedAt!,
      daysAfterSubmission,
      viewUrl,
      viewLinkValidFor,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendPresidentLinkExpired(applicationId: string, magicLinkUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = presidentLinkExpiredTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      magicLinkUrl,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  async sendChangesRequested(applicationId: string, resumeUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    
    // Applications are returned by the President (presidentNotes). Older records
    // may instead carry an officer's notes, which are signed as from FAFICS.
    let reviewerName = 'FAFICS';
    let notes = app.secretaryNotes || '';
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
      resumeUrl,
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

  async sendApproved(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { expertise: true },
    });
    const labelOf = (exp: (typeof app.expertise)[number]) =>
      exp.isCustom && exp.otherDescription ? exp.otherDescription : exp.areaLabel;

    // Only the areas the applicant rated as "expert".
    const expertAreas = app.expertise
      .filter(exp => exp.expertiseLevel === 'expert')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(labelOf);

    // The applicant's top 3 preferred areas (preference is capped at 3 in the form).
    const preferredAreas = app.expertise
      .filter(exp => exp.isPreferred)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 3)
      .map(labelOf);

    const { subject, html } = approvedTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      expiryDate: app.expiresAt!,
      expertAreas,
      preferredAreas,
      preferredCommittees: app.preferredCommittees,
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

  async sendRenewalReminder(applicationId: string, daysLeft: number): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = renewalReminderTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      daysLeft,
      expiryDate: app.expiresAt!,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendRemovedFromPool(applicationId: string, reason?: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = removedFromPoolTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      reason: reason?.trim() || undefined,
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

  async sendApplicantEditLink(
    applicationId: string,
    resumeUrl: string,
    validFor: string,
    reason: 'requested' | 'started_again' = 'requested',
  ): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = applicantEditLinkTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      resumeUrl,
      referenceNumber: app.referenceNumber || 'Draft',
      status: app.status,
      validFor,
      reason,
    });
    return this.sendEmail(app.email, subject, html);
  }

  /**
   * Password-reset link for a dashboard user. Unlike every other send here this
   * one is keyed on the user record, not an application, so the recipient and
   * display name are passed in directly.
   */
  async sendPasswordReset(params: {
    to: string;
    recipientName: string;
    resetUrl: string;
    validFor: string;
    triggeredByAdmin?: boolean;
  }): Promise<{ messageId: string }> {
    const { subject, html } = passwordResetTemplate({
      recipientName: params.recipientName,
      resetUrl: params.resetUrl,
      validFor: params.validFor,
      triggeredByAdmin: params.triggeredByAdmin,
    });
    return this.sendEmail(params.to, subject, html);
  }

  /** Confirmation that a dashboard password was changed, so an unexpected change is noticed. */
  async sendPasswordChanged(params: {
    to: string;
    recipientName: string;
    changedAt: Date;
  }): Promise<{ messageId: string }> {
    const { subject, html } = passwordChangedTemplate({
      recipientName: params.recipientName,
      changedAt: formatDisplayDateTime(params.changedAt),
      loginUrl: `${this.getWebBaseUrl()}/admin/login`,
    });
    return this.sendEmail(params.to, subject, html);
  }

  async sendDraftSavedEmail(applicationId: string, resumeUrl: string): Promise<{ messageId: string }> {
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const { subject, html } = draftSavedTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      resumeUrl,
      statusUrl: `${this.getWebBaseUrl()}/status`,
    });
    return this.sendEmail(app.email, subject, html);
  }
}
