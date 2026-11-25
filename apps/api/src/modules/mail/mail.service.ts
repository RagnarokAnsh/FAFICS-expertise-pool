import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
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
    private readonly database: DatabaseService,
  ) {
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
        secure: smtpPort === 465,
        requireTLS: smtpPort === 587,
        auth: {
          user: this.configService.get<string>('mail.smtpUser'),
          pass: this.configService.get<string>('mail.smtpPass'),
        },
      });
    }
  }

  private toCamelCase(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }

  private mapRow<T extends Record<string, any>>(row: T): T & Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[this.toCamelCase(key)] = value;
    }
    return mapped as T & Record<string, any>;
  }

  private async getApplication(applicationId: string, includeExpertise = false): Promise<any> {
    const result = await this.database.query<any>(
      'SELECT * FROM applications WHERE id = $1 LIMIT 1',
      [applicationId],
    );
    const appRow = result.rows[0];
    if (!appRow) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const app = this.mapRow(appRow);
    if (!includeExpertise) {
      return app;
    }

    const expertiseResult = await this.database.query<any>(
      'SELECT * FROM application_expertise WHERE application_id = $1 ORDER BY sort_order ASC',
      [applicationId],
    );
    return { ...app, expertise: expertiseResult.rows.map((row) => this.mapRow(row)) };
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: {
      replyTo?: string;
      bcc?: string | string[];
    },
  ): Promise<{ messageId: string }> {

    const from = this.configService.get<string>(
      'mail.fromEmail',
      'support@fafics.com',
    );

    // Resend
    if (this.useResend) {
      const result = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
        reply_to: options?.replyTo,
        bcc: options?.bcc,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { messageId: result.data!.id };
    }

    // Nodemailer SMTP
    const info = await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo: options?.replyTo,
      bcc: options?.bcc,
      textEncoding: 'base64',
    });

    return { messageId: info.messageId };
  }

  private getWebBaseUrl(): string {
    const base = this.configService.get<string>('app.webBaseUrl') || this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    return base.replace(/\/+$/, '');
  }

  async sendSubmissionConfirmation(
    applicationId: string,
    viewUrl: string,
    viewLinkValidFor: string,
  ): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
    const { subject, html } = applicantViewLinkTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      referenceNumber: app.referenceNumber!,
      viewUrl,
      validFor,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendPresidentReviewRequest(applicationId: string, magicLinkUrl: string): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
    const { subject, html } = presidentLinkExpiredTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      magicLinkUrl,
    });
    return this.sendEmail(app.presidentEmail, subject, html);
  }

  async sendChangesRequested(applicationId: string, resumeUrl: string): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
    
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
    const app = await this.getApplication(applicationId);
    const presidentName = `the President of ${app.associationName}`;
    const { subject, html } = endorsedTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      presidentName,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendApproved(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId, true);
    const labelOf = (exp: any) => (exp.isCustom && exp.otherDescription ? exp.otherDescription : exp.areaLabel);
    const expertAreas = (app.expertise ?? [])
      .filter((exp: any) => exp.expertiseLevel === 'expert')
      .sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .map(labelOf);
    const preferredAreas = (app.expertise ?? [])
      .filter((exp: any) => exp.isPreferred)
      .sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
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
    const app = await this.getApplication(applicationId);
    const { subject, html } = rejectedTemplate({
      referenceNumber: app.referenceNumber!,
      applicantName: `${app.firstName} ${app.lastName}`,
      secretaryNotes: app.secretaryNotes || undefined,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendRenewalReminder(applicationId: string, daysLeft: number): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
    const { subject, html } = renewalReminderTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      daysLeft,
      expiryDate: app.expiresAt!,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendRemovedFromPool(applicationId: string, reason?: string): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
    const { subject, html } = removedFromPoolTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      reason: reason?.trim() || undefined,
      webBaseUrl: this.getWebBaseUrl(),
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendExpired(applicationId: string): Promise<{ messageId: string }> {
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
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
    const app = await this.getApplication(applicationId);
    const { subject, html } = draftSavedTemplate({
      applicantName: `${app.firstName} ${app.lastName}`,
      resumeUrl,
      statusUrl: `${this.getWebBaseUrl()}/status`,
    });
    return this.sendEmail(app.email, subject, html);
  }

  async sendContactUsEmail(
    email: string,
    message: string,
  ): Promise<{ messageId: string }> {

    const escapeHtml = (value: string): string =>
      value.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        };

        return entities[char];
      });

    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

    const subject = 'FAFICS - New Contact Us Enquiry';

    const html = `
      <div style="font-family:Arial,sans-serif;
                  max-width:600px;margin:auto;">

        <div style="background:#0d2240;padding:20px;">
          <h2 style="color:#ffffff;margin:0;">
            FAFICS Contact Us
          </h2>
        </div>

        <div style="padding:24px;background:#ffffff;">

          <p>A new enquiry has been submitted
            through the FAFICS website.</p>

          <p>
            <strong>Sender Email:</strong><br>
            ${safeEmail}
          </p>

          <p><strong>Message:</strong></p>

          <div style="background:#f5f6f8;
                      padding:16px;
                      border-left:4px solid #c8973a;">
            ${safeMessage}
          </div>

        </div>

        <div style="padding:15px;background:#f5f6f8;
                    font-size:12px;color:#666;">
          FAFICS Website - Contact Enquiry
        </div>

      </div>
    `;

    return this.sendEmail(
      'support@fafics.com',
      subject,
      html,
      {
        replyTo: email,
        bcc: 'expool@fafics.com',
      },
    );
  }

}
