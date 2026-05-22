import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@fafics.org',
  secretaryEmail: process.env.SECRETARY_EMAIL || 'secretary@fafics.org',
  smtpHost: process.env.SMTP_HOST || 'localhost',
  smtpPort: parseInt(process.env.SMTP_PORT || '1025', 10),
}));
