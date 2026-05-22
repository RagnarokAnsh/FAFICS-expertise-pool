import { buildEmailHtml } from './base.template';

export function endorsedTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  presidentName: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool [${params.referenceNumber}] — Application endorsed`;
  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Good news! Your application (Reference: ${params.referenceNumber}) has been endorsed by ${params.presidentName}.</p>
    <p>Your application is now under active review by the FAFICS Secretary. We will notify you once a final decision has been made.</p>
    <p>Thank you for your patience.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
