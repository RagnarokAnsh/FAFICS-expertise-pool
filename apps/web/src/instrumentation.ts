import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN_WEB || process.env.NEXT_PUBLIC_SENTRY_DSN_WEB,
      tracesSampleRate: 1,
      // Enable debug in development to confirm Sentry initializes
      debug: process.env.NODE_ENV === 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN_WEB || process.env.NEXT_PUBLIC_SENTRY_DSN_WEB,
      tracesSampleRate: 1,
      debug: process.env.NODE_ENV === 'development',
    });
  }
}

