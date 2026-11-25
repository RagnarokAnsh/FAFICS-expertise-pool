import { buildEmailHtml } from './base.template';

export interface ApplicantEditLinkTemplateParams {
  applicantName: string;
  resumeUrl: string;
  referenceNumber: string;
  status: string;
  /** How long the link works, e.g. "3 hours" or "30 days". */
  validFor: string;
  /**
   * 'requested': the applicant asked for a link (status page).
   * 'started_again': someone started a new application with this applicant's
   * details while one is in progress; the link goes to the owner instead.
   */
  reason?: 'requested' | 'started_again';
}

export const applicantEditLinkTemplate = ({
  applicantName,
  resumeUrl,
  referenceNumber,
  status,
  validFor,
  reason = 'requested',
}: ApplicantEditLinkTemplateParams) => {
  const subject = 'FAFICS Expertise Pool — Resume editing your application';

  let changesRequestedNotice = '';
  if (status === 'changes_requested') {
    changesRequestedNotice = `
      <div style="background-color: #fef3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; font-size: 16px;">Action Required</h3>
        <p style="margin-bottom: 0;">Your Association President has reviewed your application and requested changes. Their comments are shown when you open the editing link below.</p>
      </div>
    `;
  }

  const html = buildEmailHtml(
    `Resume editing your application`,
    `
    <p>Dear ${applicantName},</p>
    ${
      reason === 'started_again'
        ? '<p>A new application was just started with your email address and association, but you already have an application in progress. To keep your saved details safe, please continue it from the link below.</p>'
        : '<p>You requested a link to continue editing your FAFICS Expertise Pool application.</p>'
    }
    
    ${changesRequestedNotice}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resumeUrl}" style="background-color: #1a3a6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Continue Editing My Application</a>
    </div>
    
    <p style="font-size: 13px; color: #666; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
      <strong>Security notice:</strong> This link works for ${validFor}. Please do not forward this email. If this was not you, you can ignore it; nothing has been changed.
    </p>
    
    <p style="font-size: 14px; margin-top: 20px;">
      Reference Number: <strong>${referenceNumber}</strong>
    </p>
    `
  );

  return { subject, html };
};
