import { buildEmailHtml } from './base.template';

export function presidentLinkExpiredTemplate(params: {
  applicantName: string;
  magicLinkUrl: string;
}): { subject: string; html: string } {
  const subject = `New endorsement link — ${params.applicantName}'s FAFICS Expertise Pool application`;
  const body = `
    <p>Dear President,</p>
    <p>Your previous endorsement link for <strong>${params.applicantName}</strong>'s FAFICS Expertise Pool application has expired.</p>
    <p>A new, secure link has been generated for you. Please click the button below to review and endorse the application:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.magicLinkUrl}" style="display: inline-block; background-color: #C8973A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px;">Review & Endorse Application</a>
    </div>
    <p>This single-use link will expire in 14 days.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
