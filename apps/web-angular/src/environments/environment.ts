/**
 * Build-time settings — the Angular counterpart of the Next.js app's
 * NEXT_PUBLIC_API_URL. The value is compiled into the bundle, so change it
 * BEFORE running `ng build`.
 *
 * `/api` (the default) means "the API is served from the same domain as the
 * site", e.g. https://experts.example.org/api — the recommended shared-hosting
 * layout. During `ng serve`, proxy.conf.json forwards /api to the local NestJS
 * API on port 3001, so the same value works in development too.
 *
 * If the API lives elsewhere, use its full URL, e.g.
 * 'https://api.example.org/api'.
 */
export const environment = {
  apiUrl: '/api',
};
