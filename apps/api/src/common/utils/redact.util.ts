/**
 * Makes a request URL safe to write to logs.
 *
 * Several URLs carry a secret link token (/endorse/<token>,
 * /applications/resume/<token>) — anyone who can read the logs could otherwise
 * open those links, and a resume link stays valid for 30 days. Tokens are cut
 * to a short prefix (enough to correlate log lines) and email addresses in the
 * query string are masked.
 */
export function redactUrl(url: string): string {
  return url
    .replace(/[0-9a-f]{64}/gi, (token) => `${token.slice(0, 6)}…`)
    .replace(/([?&]email=)[^&]*/gi, '$1…');
}
