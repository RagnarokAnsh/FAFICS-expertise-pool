import { buildEmailHtml } from './base.template';

export interface PasswordResetTemplateParams {
  recipientName: string;
  resetUrl: string;
  /** How long the link stays valid, already formatted (e.g. "1 hour"). */
  validFor: string;
  /** Set when an administrator triggered the reset rather than the user. */
  triggeredByAdmin?: boolean;
}

export const passwordResetTemplate = ({
  recipientName,
  resetUrl,
  validFor,
  triggeredByAdmin = false,
}: PasswordResetTemplateParams) => {
  const subject = 'FAFICS Expertise Pool — Reset your password';

  const intro = triggeredByAdmin
    ? `<p>A FAFICS administrator has started a password reset for your dashboard account. Use the button below to choose a new password.</p>`
    : `<p>We received a request to reset the password for your FAFICS Expertise Pool dashboard account.</p>`;

  const html = buildEmailHtml(
    'Reset your password',
    `
    <p>Dear ${recipientName},</p>
    ${intro}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #1a3a6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Choose a New Password</a>
    </div>

    <p style="font-size: 13px; color: #666; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
      <strong>Security notice:</strong> This link is valid for ${validFor} and can only be used once.
      If you did not request a password reset, you can safely ignore this email &mdash; your current
      password remains unchanged.
    </p>

    <p style="font-size: 13px; color: #8892aa; margin-top: 20px; word-break: break-all;">
      If the button does not work, copy this address into your browser:<br />${resetUrl}
    </p>
    `,
  );

  return { subject, html };
};
