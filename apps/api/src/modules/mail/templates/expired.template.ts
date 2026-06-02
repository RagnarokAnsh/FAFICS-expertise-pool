import { buildEmailHtml } from './base.template';

export function expiredTemplate(params: {
  applicantName: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = `Your FAFICS Expertise Pool profile has expired`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your profile in the FAFICS Expertise Pool has officially expired after its 3-year validity period.</p>
    <p>Your information is no longer active in the Expertise Pool. If you would like to be considered for the pool again, you can submit a new application at any time.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/apply" style="display: inline-block; background-color: #0D2240; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Reapply for the Pool</a>
    </div>
    <p>Thank you for your past contributions.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
