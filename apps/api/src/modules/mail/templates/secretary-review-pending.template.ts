import { buildEmailHtml } from './base.template';

export function secretaryReviewPendingTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  associationName: string;
  applicationId: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const subject = `New endorsed application ready for review — ${params.referenceNumber}`;
  const body = `
    <p>Dear Secretary,</p>
    <p>A new application has been endorsed by ${params.associationName} and is ready for your review.</p>
    <ul>
      <li><strong>Applicant:</strong> ${params.applicantName}</li>
      <li><strong>Reference Number:</strong> ${params.referenceNumber}</li>
      <li><strong>Association:</strong> ${params.associationName}</li>
    </ul>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.webBaseUrl}/admin/applications/${params.applicationId}" style="display: inline-block; background-color: #0D2240; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Review in Dashboard</a>
    </div>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
