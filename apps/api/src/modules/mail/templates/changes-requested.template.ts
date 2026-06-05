import { buildEmailHtml } from './base.template';

export function changesRequestedTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  reviewerName: string; // e.g., "President Name" or "FAFICS Secretary"
  reviewerNotes: string;
  resumeUrl: string; // direct single-use edit link to /apply/resume/[token]
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool [${params.referenceNumber}] — Changes requested`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your application to the FAFICS Expertise Pool (Reference: ${params.referenceNumber}) has been returned for revision by ${params.reviewerName}.</p>
    <p>Please review the following comments and update your application accordingly:</p>
    <div style="margin: 24px 0; padding: 16px 20px; background-color: #fcf8f2; border-left: 4px solid #C8973A; font-style: italic; color: #4a5578;">
      "${params.reviewerNotes}"
    </div>
    <p>Click below to open your application and make the requested changes:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.resumeUrl}" style="display: inline-block; background-color: #0D2240; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Edit My Application</a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">This is a single-use link tied to your application. If the button does not work, copy and paste this URL into your browser:<br/><span style="word-break: break-all;">${params.resumeUrl}</span></p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
