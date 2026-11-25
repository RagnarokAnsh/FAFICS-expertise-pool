import { buildEmailHtml, esc } from './base.template';
import { formatDisplayDate } from '../../../common/utils/display-date';

export function presidentReviewTemplate(params: {
  applicantName: string;
  associationName: string;
  submissionDate: Date;
  magicLinkUrl: string;
  preferredCommittees?: string[];
}): { subject: string; html: string } {
  const subject = `Action Required — Please endorse ${params.applicantName}'s FAFICS Expertise Pool application`;
  const formattedDate = formatDisplayDate(params.submissionDate);
  const committeeList = (params.preferredCommittees ?? []).map(c => `<li>${esc(c)}</li>`).join('');
  const committeeSection = committeeList
    ? `
    <p>The applicant has expressed interest in the following FAFICS position(s) / standing committee(s):</p>
    <ul>
      ${committeeList}
    </ul>`
    : '';
  const body = `
    <p>Dear President of ${esc(params.associationName)},</p>
    <p><strong>${esc(params.applicantName)}</strong> has submitted an application to join the FAFICS Expertise Pool on ${formattedDate}.</p>
    <p>As their Member Association President, your endorsement is required before their application can proceed to the Expertise Pool.</p>
    ${committeeSection}
    <div style="text-align: center; margin: 32px 0;">
      <a href="${esc(params.magicLinkUrl)}" style="display: inline-block; background-color: #C8973A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Review & Endorse Application</a>
    </div>
    <p><strong>Important Information:</strong></p>
    <ul>
      <li>This is a secure, single-use link granting view-only access to the application.</li>
      <li>The link will expire in 14 days.</li>
      <li>If you notice any issues with the application, you will have the option to return it to the applicant with your comments.</li>
    </ul>
    <p>If you have any questions, please contact <a href="mailto:support@fafics.com">support@fafics.com</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
