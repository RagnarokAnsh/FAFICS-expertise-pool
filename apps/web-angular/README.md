# FAFICS Expertise Pool — Angular frontend

An Angular 21 port of the Next.js frontend in [`apps/web`](../web), with the **same design, text and behaviour**. It exists because the client's hosting is shared cPanel hosting (MilesWeb). A shared account can serve static files but can't run a Next.js server. `ng build` produces plain HTML/JS/CSS that can be uploaded to the domain's `public_html`, and the unchanged NestJS API ([`apps/api`](../api)) runs alongside it as a cPanel Node.js app at `/api`.

Every public URL is the same as in the Next.js app. Links already sent by email (`/endorse/<token>`, `/apply/resume/<token>`, `/admin/reset-password/<token>`) keep working.

| Area | Routes |
| --- | --- |
| Applicants | `/apply` (5-step form with autosave), `/apply/resume/:token`, `/apply/:draftId`, `/status` |
| Association presidents | `/endorse/:token` |
| Secretariat | `/admin/login`, `/admin/forgot-password`, `/admin/reset-password/:token`, `/admin/dashboard`, `/admin/applications`, `/admin/applications/:id`, `/admin/roster`, `/admin/expiring`, `/admin/export`, `/admin/reports`, `/admin/users`, `/admin/account` |

## Running locally

Prerequisites: the repo root `npm install` has run, `packages/shared` is built (`npm run build -w packages/shared`), and the API is running on port 3001 (`npm run start:dev` in `apps/api`).

```bash
cd apps/web-angular
npm run dev
```

Open http://localhost:4300. The dev server forwards `/api/*` to `http://localhost:3001` ([proxy.conf.json](proxy.conf.json)), so the browser sees the API on the same origin, just as it will in production.

## Building for production

```bash
cd apps/web-angular
npm run build
```

The output in `dist/` is the complete website. It contains `index.html`, content-hashed JS/CSS chunks, `media/` (fonts), `logo.png`, `favicon.ico` and `.htaccess`.

The API location is compiled in from [src/environments/environment.ts](src/environments/environment.ts):

| Setup | `apiUrl` | Build command |
| --- | --- | --- |
| API on the same domain at `/api` (recommended) | `'/api'` (default) | `npm run build` |
| API on another domain | `'https://api.example.org/api'`, and add that origin to `connect-src` in `public/.htaccess` | `npm run build` |
| Site under a sub-path, e.g. `https://example.org/experts/` | `'/experts/api'` | `npx ng build --base-href /experts/` |

### Check the build before uploading

```bash
node tools/preview-dist.mjs
```

This serves `dist/` on http://localhost:4400 the way the host will. Unknown paths fall back to `index.html`, `/api` is proxied to port 3001, and the headers from `.htaccess`, including the Content-Security-Policy, are applied. Click through the app and keep the browser console open; there should be no CSP errors.

## Deploying to cPanel shared hosting

The full procedure, including the API and the database, is in [DEPLOYMENT.md → Appendix D](../../DEPLOYMENT.md#appendix-d--cpanel-shared-hosting-milesweb-with-the-angular-frontend). The frontend part:

1. `npm run build`.
2. In cPanel File Manager (or over FTP/SSH), empty the domain's document root, usually `public_html/`. **Keep** `api/`, `.well-known/` and any `CLOUDLINUX PASSENGER CONFIGURATION` block that cPanel added to `.htaccess`.
3. Upload the **contents** of `dist/`, including the hidden `.htaccess`.

[`public/.htaccess`](public/.htaccess) (copied into `dist/` by the build) does the following:
- sends every app route to `index.html`;
- leaves `/api` to the Node.js app;
- forces HTTPS, which the officer login cookie requires;
- lets browsers cache the hashed chunks for a year while always revalidating `index.html`;
- sets security headers.

## How it is built

- Angular 21: standalone components, zoneless change detection, signals, OnPush and lazy-loaded pages. Tailwind CSS 3.4 uses the same theme as `apps/web`.
- `src/app/lib/`: API clients, zod schemas, constants and utilities, copied from `apps/web/src/lib`. `zod` is pinned to the same version (4.4.3) so validation messages match exactly.
- `src/app/core/form/`: a small port of react-hook-form's behaviour (`FormStore`, `[appRegister]`, `[appController]`, zod resolver). The application form validates, shows errors, autosaves and focuses fields exactly like the React version.
- `src/app/components/admin/charts/`: SVG charts that reproduce the Recharts output of the React dashboard (layout, ticks, legend, tooltips, animation) without the React dependency.
- `src/fonts.css` + `src/fonts/`: the self-hosted Playfair Display and DM Sans files that `next/font` produces, with the same fallback metrics.
- TanStack Angular Query stands in for React Query, with the same defaults and query keys.

## Status (September 2026)

- **Complete.** Every page and feature of `apps/web` has been ported, including the officer dashboard and its charts.
- **Verified against the Next.js app** with the tools in [`tools/parity`](tools/parity):
  - Every public and officer page was screenshotted at desktop (1280 px), tablet (820 px) and mobile (390 px) widths. They match to within 0.4% of pixels, and the difference is the logo's image compression.
  - Ten scripted journeys produce the same screens and the same API calls in both apps: applying, the 30-second autosave, status checks, endorsement and return, resuming drafts, officer actions, user management, export and password reset.
  - The production build runs under the `.htaccess` Content-Security-Policy without violations.
  - Automated accessibility checks give identical results.
- **Before go-live:** follow [DEPLOYMENT.md → Appendix D](../../DEPLOYMENT.md#appendix-d--cpanel-shared-hosting-milesweb-with-the-angular-frontend). The hosting plan must support Node.js applications and PostgreSQL (otherwise use an external managed database), outbound SMTP must be allowed, and the seeded administrator password must be changed after the first sign-in.

## Known differences from `apps/web`

These were verified and kept on purpose:

- **Resuming a draft from the emailed link.** Sections that have no entries yet (education, languages, UN experience) show one empty row, which is what the form code intends. The Next.js app shows none there: its `form.reset()` runs after the step has added the row and wipes it. The Angular behaviour was kept by client decision (September 2026).
- **The endorsement and resume pages load their data in the browser.** Next.js loads it on the server. The pages and the API calls are the same.
- **The logo is served as the original PNG.** Next.js re-compresses it through its image optimizer, so a few pixels differ.

Since the Angular app went into production (autumn 2026), some changes are made here only, so these pages no longer match `apps/web`:

- **Admin application page** (`/admin/applications/:id`). It now has a full-width header with the name, status, reference, association and submission date. Below it, the profile (`components/admin/application-profile.ts`) sits on the left and a 360 px Status & Actions column on the right, with both columns starting at the same line. On narrow screens Status & Actions comes first and the audit timeline last. Field grids replace the paired cards, and the tables share column boundaries; on phones the experience tables turn into stacked records.
- **President's review page** (`/endorse/:token`). It uses the same profile component and the same header as the admin page, followed by the review notice and the Endorse / Return buttons (`components/endorse/endorsement-view.ts`).
- **President endorsement links** (review point 10): the Resend to President and Edit President Email actions on the admin page, and the 3- and 7-day reminders.
- **Experience durations** show the label the applicant picked ("3-5 years", "20+ years") instead of the stored upper bound ("5", "99"), on both the admin page and the President's page.
- **Officer roles** (`lib/auth/roles.ts`, `core/role.guard.ts`): menus, pages and buttons follow the signed-in role, and User Management offers Administrator and Management (view and export only).
- **Contact Us**: a header and footer button opens a dialog (`components/layout/contact-dialog.ts`) that posts to `/api/contact`.
- **The production build calls `https://api.fafics.com/api`** (`environments/environment.ts`); `ng serve` uses `environment.development.ts` (`/api`, proxied to the local API). So `tools/preview-dist.mjs` and `flows.js` against `dist/` would call the live API: test with `ng serve` instead (e.g. `--proxy-config tools/parity/proxy.parity.json` for the parity stack on :3002).

## Keeping it in sync with `apps/web`

The React app is the reference. When a page changes in `apps/web`, make the same change here, with the same markup, classes and text. The parity tooling in [`tools/parity`](tools/parity) screenshots every route in both apps and reports pixel differences:

```bash
cd tools/parity
npm install         # once; a standalone package, uses the installed Google Chrome (override with CHROME=<path>)
node compare.js     # or: node compare.js --only=apply,status,dashboard
```

Next.js (:3000), this app (:4300) and the API (:3001) must all be running. Results go to `tools/parity/compare/`. For admin pages, the script signs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment or the repo's `.env`. `NEXT_URL` / `NG_URL` point it at other instances.

The same folder has three more tools:

- `stack.js` starts an isolated test backend: its own `fafics_parity` database, the API on port 3002 and a local mail catcher, so no real email is sent.
- `flows.js` clicks through complete journeys in both apps and compares screenshots, API calls and console errors: applying, status, endorsement, returning and resubmitting, resume links, officer actions, export and password reset.
- `a11y.js` runs an automated accessibility check on both apps.

The comments at the top of each script explain how to set it up.
