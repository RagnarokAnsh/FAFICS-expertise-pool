import { registerAs } from '@nestjs/config';

/**
 * CIMP support-portal integration.
 *
 * FAFICS is registered as a "platform" inside CIMP. Signed-in officers are
 * handed off to the CIMP reporter portal with a short-lived signed token. The
 * per-platform signing secret lives here server-side only — it is never sent to
 * the browser.
 */
export default registerAs('support', () => ({
  // The platform "key" you created in CIMP (Admin → Platforms).
  platformKey: process.env.CIMP_PLATFORM_KEY,
  // The per-platform hand-off signing secret from CIMP (the "Rotate" button).
  handoffSecret: process.env.CIMP_HANDOFF_SECRET,
  // Base URL of the CIMP support app, e.g. https://35.154.196.105
  baseUrl: process.env.CIMP_SUPPORT_URL,
}));
