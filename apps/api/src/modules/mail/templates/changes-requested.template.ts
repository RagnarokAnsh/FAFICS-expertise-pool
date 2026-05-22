import { buildEmailHtml } from './base.template';

export function changesRequestedTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  reviewerName: string; // e.g., "President Name" or "FAFICS Secretary"
  reviewerNotes: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool [${params.referenceNumber}] — Changes requested`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your application to the FAFICS Expertise Pool (Reference: ${params.referenceNumber}) has been returned for revision by ${params.reviewerName}.</p>
    <p>Please review the following comments and update your application accordingly:</p>
    <div style="margin: 24px 0; padding: 16px 20px; background-color: #fcf8f2; border-left: 4px solid #C8973A; font-style: italic; color: #4a5578;">
      "${params.reviewerNotes}"
    </div>
    <p>You can check your status and resume your draft here:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/status" style="display: inline-block; background-color: #0D2240; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Check Status & Update Application</a>
    </div>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
