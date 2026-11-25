import { buildEmailHtml } from './base.template';
import { formatDisplayDate } from '../../../common/utils/display-date';

/**
 * Sent 90 and 30 days before a profile expires. Profiles last three years;
 * at expiry they are removed and the member applies again from scratch.
 */
export function renewalReminderTemplate(params: {
  applicantName: string;
  daysLeft: number;
  expiryDate: Date;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const formattedDate = formatDisplayDate(params.expiryDate);
  const subject = `Your FAFICS Expertise Pool profile expires on ${formattedDate}`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your profile in the FAFICS Expertise Pool will expire in ${params.daysLeft} days, on <strong>${formattedDate}</strong>.</p>
    <p>Profiles stay in the Expertise Pool for three years. When yours expires, it will be removed from the pool and your application data will be deleted.</p>
    <p>If you would like to stay in the Expertise Pool, please submit a new application <strong>after ${formattedDate}</strong>. It will be sent to your Association President for endorsement, as before.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/apply" style="display: inline-block; background-color: #C8973A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Application Form</a>
    </div>
    <p>If you have any questions, contact <a href="mailto:support@fafics.com">support@fafics.com</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
