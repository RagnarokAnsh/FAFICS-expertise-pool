import { buildEmailHtml } from './base.template';

/** Sent when a profile reaches the end of its three years and is removed. */
export function expiredTemplate(params: {
  applicantName: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = `Your FAFICS Expertise Pool profile has expired`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your profile in the FAFICS Expertise Pool has reached the end of its three-year period. It has been removed from the pool and your application data has been deleted.</p>
    <p>If you would like to join the Expertise Pool again, please submit a new application. It will be sent to your Association President for endorsement, as before.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/apply" style="display: inline-block; background-color: #0D2240; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Apply Again</a>
    </div>
    <p>Thank you for your contribution to FAFICS.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
