import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  // No trailing slash: email links are built by string concatenation.
  webBaseUrl: (process.env.WEB_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
}));
