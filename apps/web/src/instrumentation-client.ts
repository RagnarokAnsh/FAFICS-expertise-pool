import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_WEB,
  tracesSampleRate: 1,
  // Enable debug in development to confirm Sentry initializes in the browser
  debug: process.env.NODE_ENV === 'development',
});
