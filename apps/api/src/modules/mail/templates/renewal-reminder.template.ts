import { buildEmailHtml } from './base.template';

export function renewalReminderTemplate(params: {
  applicantName: string;
  daysLeft: number;
  expiryDate: Date;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = `Your FAFICS Expertise Pool profile expires in ${params.daysLeft} days`;
  const formattedDate = params.expiryDate.toLocaleDateString('en-GB');
  
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>This is a reminder that your profile in the FAFICS Expertise Pool is set to expire in ${params.daysLeft} days, on <strong>${formattedDate}</strong>.</p>
    <p>To remain in the active pool, you must renew your profile before it expires.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/apply" style="display: inline-block; background-color: #C8973A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Reapply / Renew Profile</a>
    </div>
    <p>If you choose not to renew, your profile will automatically become inactive on the expiry date. If you need assistance, contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
