import { buildEmailHtml } from './base.template';

/** Sent (if the officer chooses) when an officer removes a profile from the pool. */
export function removedFromPoolTemplate(params: {
  applicantName: string;
  reason?: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = 'Your FAFICS Expertise Pool profile has been removed';
  const reasonBlock = params.reason
    ? `<div style="margin: 20px 0; padding: 16px; background-color: #f9fafb; border-left: 4px solid #C8973A; font-style: italic;">"${params.reason}"</div>`
    : '';
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Your profile has been removed from the FAFICS Expertise Pool, and your application data has been deleted.</p>
    ${reasonBlock}
    <p>If you believe this is a mistake, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>. You are welcome to submit a new application at any time at <a href="${params.webBaseUrl}/apply">${params.webBaseUrl}/apply</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
