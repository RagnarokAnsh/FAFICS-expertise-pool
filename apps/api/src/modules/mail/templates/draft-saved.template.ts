import { buildEmailHtml } from './base.template';

export interface DraftSavedTemplateParams {
  applicantName: string;
  resumeUrl: string;
  statusUrl: string;
}

export const draftSavedTemplate = ({
  applicantName,
  resumeUrl,
  statusUrl,
}: DraftSavedTemplateParams) => {
  const subject = 'FAFICS Expertise Pool — Your application has been saved';

  const html = buildEmailHtml(
    `Your application has been saved`,
    `
    <p>Dear ${applicantName},</p>

    <p>Thank you for starting your FAFICS Expertise Pool application.
    Your progress has been saved as a draft.</p>

    <p>Use the link below to continue filling in your application at any time.
    Your information is saved and you can pick up exactly where you left off.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resumeUrl}" style="background-color: #0D2240; color: #C8973A; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Continue My Application</a>
    </div>

    <p style="font-size: 13px; color: #8892aa; background-color: #f8f9fa; padding: 14px; border-radius: 6px;">
      This link is valid for 30 days and can be reused until you submit your
      application. If it expires, you can request a new link from the
      <a href="${statusUrl}" style="color: #0D2240; text-decoration: underline;">status page</a>.
    </p>

    <p style="font-size: 13px; color: #8892aa; margin-top: 24px;">
      If you did not start a FAFICS Expertise Pool application, you can safely
      ignore this email.
    </p>
    `
  );

  return { subject, html };
};
