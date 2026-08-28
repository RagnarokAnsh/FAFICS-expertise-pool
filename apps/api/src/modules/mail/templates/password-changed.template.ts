import { buildEmailHtml } from './base.template';

export interface PasswordChangedTemplateParams {
  recipientName: string;
  /** Already-formatted timestamp of the change, in UTC. */
  changedAt: string;
  loginUrl: string;
}

export const passwordChangedTemplate = ({
  recipientName,
  changedAt,
  loginUrl,
}: PasswordChangedTemplateParams) => {
  const subject = 'FAFICS Expertise Pool — Your password was changed';

  const html = buildEmailHtml(
    'Your password was changed',
    `
    <p>Dear ${recipientName},</p>
    <p>The password for your FAFICS Expertise Pool dashboard account was changed on <strong>${changedAt}</strong>.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background-color: #1a3a6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to the Dashboard</a>
    </div>

    <div style="background-color: #fef3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 6px;">
      <p style="margin: 0;"><strong>Did not make this change?</strong> Contact the FAFICS secretariat at
      <a href="mailto:secretary@fafics.org" style="color: #856404;">secretary@fafics.org</a> immediately.</p>
    </div>
    `,
  );

  return { subject, html };
};
