import { buildEmailHtml } from './base.template';

export function approvedTemplate(params: {
  applicantName: string;
  expiryDate: Date;
  expertAreas: string[];
  preferredAreas: string[];
  preferredCommittees?: string[];
}): { subject: string; html: string } {
  const subject = `Congratulations — You have been added to the FAFICS Expertise Pool`;
  const formattedDate = params.expiryDate.toLocaleDateString('en-GB');

  const expertList = params.expertAreas.map(area => `<li>${area}</li>`).join('');
  const preferredList = params.preferredAreas.map(area => `<li>${area}</li>`).join('');
  const committeeList = (params.preferredCommittees ?? []).map(c => `<li>${c}</li>`).join('');

  const expertSection = params.expertAreas.length
    ? `
    <p>You have registered as an <strong>expert</strong> in the following areas:</p>
    <ul>
      ${expertList}
    </ul>`
    : '';

  const preferredSection = params.preferredAreas.length
    ? `
    <p>Your top preferred areas where you wish to support FAFICS are:</p>
    <ul>
      ${preferredList}
    </ul>`
    : '';

  const committeeSection = committeeList
    ? `
    <p>You indicated interest in the following FAFICS position(s) / standing committee(s):</p>
    <ul>
      ${committeeList}
    </ul>`
    : '';

  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>We are pleased to inform you that your application has been approved. Welcome to the FAFICS Expertise Pool!</p>
    ${expertSection}
    ${preferredSection}
    ${committeeSection}
    <p><strong>Validity & Renewal</strong></p>
    <p>Your profile is valid for 3 years, expiring on <strong>${formattedDate}</strong>. You will receive renewal reminders before this date. To renew or update your profile in the future, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
    <p>Thank you for offering your expertise to the FAFICS community.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
