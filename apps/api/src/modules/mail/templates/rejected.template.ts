import { buildEmailHtml } from './base.template';

export function rejectedTemplate(params: {
  referenceNumber: string;
  applicantName: string;
  secretaryNotes?: string;
}): { subject: string; html: string } {
  const subject = `FAFICS Expertise Pool — Application Update [${params.referenceNumber}]`;
  
  let notesSection = '';
  if (params.secretaryNotes) {
    notesSection = `
      <p>The review committee provided the following feedback:</p>
      <div style="margin: 24px 0; padding: 16px 20px; background-color: #fcf8f2; border-left: 4px solid #C8973A; font-style: italic; color: #4a5578;">
        "${params.secretaryNotes}"
      </div>
    `;
  }

  const body = `
    <p>Dear ${params.applicantName},</p>
    <p>Thank you for your interest in joining the FAFICS Expertise Pool (Reference: ${params.referenceNumber}).</p>
    <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
    ${notesSection}
    <p>We appreciate the time you took to submit your profile and your willingness to contribute. If you have any questions, please contact <a href="mailto:secretary@fafics.org">secretary@fafics.org</a>.</p>
  `;
  return { subject, html: buildEmailHtml(subject, body) };
}
