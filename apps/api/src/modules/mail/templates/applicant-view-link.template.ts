import { buildEmailHtml, esc } from './base.template';

/** Sent when an applicant asks, from the status page, for a link to view their application. */
export function applicantViewLinkTemplate(params: {
  applicantName: string;
  referenceNumber: string;
  viewUrl: string;
  /** How long the link works, e.g. "90 days". */
  validFor: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool — View your application [${params.referenceNumber}]`;
  const body = `
    <p>Dear ${esc(params.applicantName)},</p>
    <p>You requested a link to view the application you submitted to the FAFICS Expertise Pool. This is a read-only copy: you cannot change your application from this page.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${esc(params.viewUrl)}" style="display: inline-block; background-color: #1a3a6b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">View My Application</a>
    </div>
    <p style="font-size: 13px; color: #666; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
      <strong>Security notice:</strong> This link works for ${esc(params.validFor)}. Anyone with the link can see your application details, so please do not forward this email. If you did not request this link, you can ignore this email.
    </p>
    <p style="font-size: 14px; margin-top: 20px;">
      Reference Number: <strong>${esc(params.referenceNumber)}</strong>
    </p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
