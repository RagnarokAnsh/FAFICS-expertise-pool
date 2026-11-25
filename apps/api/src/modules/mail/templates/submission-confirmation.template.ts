import { buildEmailHtml } from './base.template';

export function submissionConfirmationTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  /** Read-only link to the submitted application. */
  viewUrl: string;
  /** How long the view link works, e.g. "90 days". */
  viewLinkValidFor: string;
  /** Application Status page, where a new view link can be requested. */
  statusUrl: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool — Application Received [${params.referenceNumber}]`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Thank you for submitting your application to the FAFICS Expertise Pool.</p>
    <p>Your application has been received successfully. Please keep your reference number for future tracking:</p>
    <div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border: 1px solid #dde3ef; border-left: 4px solid #C8973A; font-size: 18px; font-weight: bold; text-align: center;">
      ${params.referenceNumber}
    </div>
    <p>You can view a read-only copy of the application you submitted at any time:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.viewUrl}" style="display: inline-block; background-color: #1a3a6b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">View My Application</a>
    </div>
    <p><strong>What happens next?</strong></p>
    <p>An endorsement request has been sent to your Member Association President. Once your President endorses your application, your profile will be added to the FAFICS Expertise Pool.</p>
    <p>We will notify you via email when your application status changes.</p>
    <p style="font-size: 13px; color: #666; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
      The view link works for ${params.viewLinkValidFor}. Anyone with the link can see your application details, so please do not forward this email. You can request a new link from the <a href="${params.statusUrl}" style="color: #1a3a6b;">Application Status page</a> using your email address and reference number.
    </p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
