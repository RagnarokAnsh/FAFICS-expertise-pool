/**
 * Build-time settings for the PRODUCTION build (`ng build`), the Angular
 * counterpart of the Next.js app's NEXT_PUBLIC_API_URL. The value is compiled
 * into the bundle, so change it BEFORE running `ng build`.
 *
 * Production serves the API from its own subdomain, https://api.fafics.com.
 * That origin must also be in `connect-src` of the Content-Security-Policy in
 * public/.htaccess and src/index.html.
 *
 * `ng serve` uses environment.development.ts instead ('/api', proxied to the
 * local API by proxy.conf.json), so a local session never calls production.
 */
export const environment = {
  apiUrl: 'https://api.fafics.com/api',
};
