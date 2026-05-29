import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  experimental: {
    // Required for Next.js 14 to load instrumentation.ts (server-side Sentry)
    instrumentationHook: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/apply',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Show Sentry build output so config errors aren't hidden
  silent: process.env.NODE_ENV === 'production',
  org: process.env.SENTRY_ORG || "fafics",
  project: process.env.SENTRY_PROJECT_WEB || "fafics-web",
  // Skip source map upload if no auth token is present (dev mode)
  ...(process.env.SENTRY_AUTH_TOKEN ? {} : {
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
  }),
});
