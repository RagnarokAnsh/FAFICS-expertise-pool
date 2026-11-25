import { buildEmailHtml } from './base.template';
import { formatDisplayDate } from '../../../common/utils/display-date';

/**
 * Sent to the applicant when their President is reminded to endorse (day 3
 * and day 7 after submission). Deliberately has NO endorsement link: only the
 * President may endorse. It links to the applicant's read-only view instead.
 */
export function applicantReminderNoticeTemplate(params: {
  applicantName: string;
  referenceNumber: string;
  associationName: string;
  presidentEmail: string;
  submissionDate: Date;
  /** Days since submission, when known (3 or 7). */
  daysAfterSubmission?: number;
  viewUrl: string;
  /** How long the view link works, e.g. "90 days". */
  viewLinkValidFor: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool — We reminded your President [${params.referenceNumber}]`;
  const formattedDate = formatDisplayDate(params.submissionDate);
  const waiting = params.daysAfterSubmission
    ? `It has been ${params.daysAfterSubmission} days since you submitted your application on ${formattedDate}, and it is still waiting for endorsement from the President of ${params.associationName}.`
    : `Your application, submitted on ${formattedDate}, is still waiting for endorsement from the President of ${params.associationName}.`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>${waiting}</p>
    <p>We have sent your President a reminder today at <strong>${params.presidentEmail}</strong>.</p>
    <p>There is nothing you need to do. If you know your President, you may want to let them know the request is waiting in their inbox. If the address above is wrong, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.viewUrl}" style="display: inline-block; background-color: #1a3a6b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">View My Application</a>
    </div>
    <p style="font-size: 13px; color: #666; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
      This link shows a read-only copy of your application and works for ${params.viewLinkValidFor}. Please do not forward this email.
    </p>
    <p style="font-size: 14px; margin-top: 20px;">Reference Number: <strong>${params.referenceNumber}</strong></p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
