import { buildEmailHtml } from './base.template';

/**
 * Automatic reminder to a President who has not yet endorsed or returned an
 * application (sent by the nightly job, 3 and 7 days after submission).
 */
export function presidentReminderTemplate(params: {
  applicantName: string;
  associationName: string;
  submissionDate: Date;
  magicLinkUrl: string;
}): { subject: string; html: string } {
  const subject = `Reminder: ${params.applicantName}'s FAFICS Expertise Pool application is awaiting your endorsement`;
  const formattedDate = params.submissionDate.toLocaleDateString('en-GB');
  const body = `
    <p>Dear President of ${params.associationName},</p>
    <p>This is a friendly reminder that <strong>${params.applicantName}</strong> submitted an application to join the FAFICS Expertise Pool on ${formattedDate}, and it is still awaiting your endorsement.</p>
    <p>The application cannot proceed to the Expertise Pool until you have reviewed it.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.magicLinkUrl}" style="display: inline-block; background-color: #C8973A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Review & Endorse Application</a>
    </div>
    <ul>
      <li>This link will expire in 14 days. Links in earlier emails about this application also still work.</li>
      <li>If you notice any issues with the application, you can return it to the applicant with your comments.</li>
    </ul>
    <p>If you are not the President of ${params.associationName}, or have any questions, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
