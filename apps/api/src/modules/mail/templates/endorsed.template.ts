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
    <p>We will email you as soon as your profile is active in the FAFICS Expertise Pool.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
