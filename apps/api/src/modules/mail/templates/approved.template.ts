import { buildEmailHtml } from './base.template';

export function approvedTemplate(params: {
  applicantName: string;
  expiryDate: Date;
  approvedAreas: string[];
}): { subject: string; html: string } {
  const subject = `Congratulations — You have been added to the FAFICS Expertise Pool`;
  const formattedDate = params.expiryDate.toLocaleDateString('en-GB');
  
  const areasList = params.approvedAreas.map(area => `<li>${area}</li>`).join('');

  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>We are pleased to inform you that your application has been approved. Welcome to the FAFICS Expertise Pool!</p>
    <p>Your profile is now active and has been registered for the following expertise areas:</p>
    <ul>
      ${areasList}
    </ul>
    <p><strong>Validity & Renewal</strong></p>
    <p>Your profile is valid for 3 years, expiring on <strong>${formattedDate}</strong>. You will receive renewal reminders before this date. To renew or update your profile in the future, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
    <p>Thank you for offering your expertise to the FAFICS community.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
