import { buildEmailHtml } from './base.template';

export function submissionConfirmationTemplate(params: {
  referenceNumber: string;
  applicantName: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool — Application Received [${params.referenceNumber}]`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Thank you for submitting your application to the FAFICS Expertise Pool.</p>
    <p>Your application has been received successfully. Please keep your reference number for future tracking:</p>
    <div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border: 1px solid #dde3ef; border-left: 4px solid #C8973A; font-size: 18px; font-weight: bold; text-align: center;">
      ${params.referenceNumber}
    </div>
    <p><strong>What happens next?</strong></p>
    <p>An endorsement request has been sent to your Member Association President. Once endorsed, your application will be reviewed by the FAFICS Secretary.</p>
    <p>We will notify you via email when your application status changes.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
