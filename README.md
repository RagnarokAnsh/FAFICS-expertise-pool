# FAFICS Expertise Pool System

A web application for building and maintaining the FAFICS roster of volunteer experts. It replaces the previous Word-form-and-Excel-spreadsheet process with an online application form, an email-based endorsement step for member association presidents, and an administrative back office for the Secretariat.

Retired UN staff apply online, their association president endorses the application by email, and the approved profile joins a searchable, exportable Expertise Pool that stays valid for three years.

---

## Contents

- [What the system does](#what-the-system-does)
- [Application lifecycle](#application-lifecycle)
- [Roles and access](#roles-and-access)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Email](#email)
- [Scheduled maintenance](#scheduled-maintenance)
- [API reference](#api-reference)
- [Angular frontend for shared hosting](#angular-frontend-for-shared-hosting)
- [Deployment](#deployment)

---

## What the system does

### For the applicant

A five-step application form at `/apply`, open to the public with no account required:

1. **Personal information** — name, contact details, nationality, gender, date of birth, UN separation date, and the member association the applicant belongs to.
2. **Education and languages** — degrees and institutions, plus languages with a proficiency level (mother tongue, proficient, working level, basic).
3. **Work experience** — four separate histories: UN service (agency, position, grade, area of expertise, duration), non-UN employment, FAFICS service, and local association service.
4. **Self-assessment** — expertise level (average, advanced, expert) across sixteen fixed areas covering both functional skills (governance, pension matters, actuarial, audit, budget, communications, HR, IT, legal, medical, procurement) and relational skills (networking, alliance building, advocacy, negotiation, community engagement), with free-text "other" areas, preferred areas of contribution, and committee preferences.
5. **Consent and submission** — data-protection consent, declaration, and submission.

Supporting behaviour:

- **Progress is saved automatically.** A draft record is created as soon as Step 1 is complete and updated roughly every 30 seconds while the form is being edited, plus immediately on each step change. The draft id is kept in the browser's local storage.
- **Drafts can be resumed on another device.** The applicant requests a resume link from the landing page and receives a single-use email link.
- **Status can be checked without an account** at `/status`, using the email address plus the reference number (`EP-0001`, `EP-0002`, …) issued at submission.
- **Applications returned for changes can be reopened** through an emailed edit link, revised, and resubmitted.

### For the association president

No account, no password. When an application is submitted, the president of the applicant's association receives an email containing a single-use link to a read-only summary of the application. From that page they can either **endorse** it — which admits the applicant to the Expertise Pool and starts the three-year validity period — or **return it for revision** with a note explaining what needs to change.

The link is valid for 14 days by default. If it lapses unused, the nightly maintenance job issues a fresh one and emails it out again.

### For the Secretariat

A password-protected back office at `/admin`:

| Section | What it provides |
| --- | --- |
| **Overview** | Counts by status, recent activity, and charts covering status distribution, nationality spread, gender balance, and expertise distribution |
| **Applications** | Filterable, paginated list of every application; full detail view with the complete audit trail; approve, reject, request changes, and internal notes |
| **Expertise Pool** | Searchable roster of approved experts, filterable by expertise area, country, and free-text search across name, nationality, and association |
| **Expiring Profiles** | Profiles expiring within 90 days, with bulk renewal reminders |
| **Export** | Excel download of the full pool, or of any single application |
| **Users** | Officer account creation and role assignment (administrators only) |
| **Notification log** | Every email the system has sent, with failures highlighted and a one-click retry |

**Excel exports** are generated with real formatting, not raw CSV dumps:

- *Full roster* — eight worksheets: Members (one row per approved expert with all summary fields), Education, UN Experience, Non-UN Experience, FAFICS Experience, Local Experience, Languages, and the Expertise assessment.
- *Single application* — one worksheet per section, laid out as a readable document with headers and sized columns.

---

## Application lifecycle

```
                                    ┌──────────────────────────────┐
                                    │  president endorses          │
draft ──► submitted ────────────────┤                              ├──► approved ──► expired
  ▲           │                     │  (admits to Expertise Pool,  │                (after 3 years,
  │           │                     │   valid 3 years)             │                 nightly job)
  │           │                     └──────────────────────────────┘
  │           │
  │           └──► changes_requested ──► applicant revises ──► submitted
  │                (president returns,        via emailed
  └── autosave     or Secretariat asks)       edit link
```

The Secretariat can additionally reject an application, or request changes on one, at any point from the admin panel. `endorsed` and `under_review` remain valid states in the data model and are still handled by the approve/reject endpoints, but the live flow admits an application to the pool at the moment the president endorses it.

**Every status change writes an immutable row to `audit_logs`** recording who acted, in what role, the old and new status, and when. The audit service exposes insert only — there is no code path that updates or deletes an audit row.

---

## Roles and access

| Role | How they sign in | What they can do |
| --- | --- | --- |
| **Applicant** | No account | Fill in, save, submit, and revise their own application; check status |
| **President** | Single-use email link | View and endorse or return applications from their association |
| **Management** | Email + password | Read-only: dashboard, applications, roster, expiring profiles, plus every Excel export. Cannot change anything, no email log, no user management |
| **Committee** | Email + password | Read-only: dashboard, applications, roster (not offered in User Management) |
| **Secretary** | Email + password | Everything Committee can do, plus approve/reject/request changes, exports, renewal reminders, notification log |
| **Admin** | Email + password | Everything, plus creating officer accounts and changing roles |

The API enforces these rules (`apps/api/src/modules/auth/roles.ts`) and reads the role from the database on every request, so a role change or deactivation applies at once. The Angular dashboard mirrors them in `lib/auth/roles.ts` to hide what a role cannot use. User Management offers Administrator and Management.

Officer sessions use a JSON Web Token held in an `HttpOnly` cookie, so the token is never readable by JavaScript in the browser. Sessions last 8 hours. Login is rate-limited to 5 attempts per minute per IP address, and the email-sending endpoints to 5 requests per minute per IP; everything else is capped at 100 requests per minute per IP.

---

## Technology

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Frontend for static/shared hosting | Angular 21 port of the same UI in `apps/web-angular` (see [below](#angular-frontend-for-shared-hosting)) |
| Forms and validation | React Hook Form with Zod schemas |
| Data fetching | TanStack Query |
| Charts | Recharts |
| Backend | NestJS 10, TypeScript |
| Database access | `node-postgres` (`pg`) through a small query layer in `apps/api/src/database`; plain SQL migrations |
| Database | PostgreSQL 16+ |
| Authentication | Passport (local and JWT strategies), bcrypt, HttpOnly cookies |
| Email | Nodemailer over SMTP (Gmail in production); Resend supported as an alternative |
| Excel | ExcelJS |
| Scheduling | `@nestjs/schedule` cron |
| Logging | Pino |
| API docs | Swagger / OpenAPI |
| Monorepo | Turborepo with npm workspaces |

There is no Redis, no message queue, and no container runtime. The system is two Node processes and a PostgreSQL database. With the Angular frontend, it is one Node process (the API) plus static files.

---

## Repository layout

```
fafics-expertise-pool/
├── apps/
│   ├── api/                    NestJS API — port 3001, all routes under /api
│   │   ├── database/
│   │   │   └── migrations/     Ordered SQL migrations (0000_baseline.sql creates
│   │   │                       the whole schema, functions, triggers, views)
│   │   ├── scripts/            migrate.js, create-admin.js, import-data.js, seed-dev.ts
│   │   └── src/
│   │       ├── common/         Global filters, interceptors, utilities
│   │       ├── config/         Typed configuration namespaces
│   │       ├── health/         GET /api/health
│   │       └── modules/
│   │           ├── admin/          Dashboard, review actions, users, notifications
│   │           ├── applications/   Public application create/save/submit/status
│   │           ├── audit/          Append-only audit log (global)
│   │           ├── auth/           Officer login, JWT, RBAC guards
│   │           ├── endorsement/    President magic-link endorse/return
│   │           ├── export/         Excel generation
│   │           ├── mail/           Templates + notification dispatch and logging
│   │           ├── queue/          Nightly maintenance job and its scheduler
│   │           └── tokens/         Magic-token issue, hash, validate, consume
│   ├── web/                    Next.js frontend — port 3000
│   │   └── src/
│   │       ├── app/            Routes: /, /apply, /status, /endorse, /admin
│   │       ├── components/     Form steps, admin tables, charts, shared UI
│   │       ├── hooks/          useApplicationForm, useAutoSave
│   │       └── lib/            API clients, Zod schemas, constants, utilities
│   └── web-angular/            Angular port of apps/web (static build) — dev port 4300
│       ├── public/.htaccess    SPA routing + headers for Apache/LiteSpeed hosting
│       ├── tools/              preview-dist.mjs (serve dist/ like the host), parity/ (screenshot diff vs apps/web)
│       └── src/app/
│           ├── pages/          One lazy-loaded page per route (same URLs as apps/web)
│           ├── components/     Form steps, admin tables, charts, shared UI
│           ├── core/           Form engine (react-hook-form port), portal, toast, error handling
│           └── lib/            API clients, Zod schemas, constants, utilities (copied from apps/web)
├── packages/
│   └── shared/                 @fafics/shared — enums and types used by both apps
├── turbo.json
└── package.json
```

`packages/shared` must be built before either app. `turbo run build` handles the ordering.

---

## Running it locally

### Prerequisites

- Node.js 20 or later (developed and built on 22.x) and npm 10 or later
- PostgreSQL 16 or later, running and reachable

### Setup

```bash
git clone <repo-url> fafics-expertise-pool
cd fafics-expertise-pool
cp .env.example .env
npm install
```

Edit `.env` and set at minimum `DATABASE_URL` and `JWT_SECRET`.

### Create the schema and seed the first user

```bash
cd apps/api
npm run db:migrate
ADMIN_EMAIL="you@example.org" ADMIN_PASSWORD="Choose-A-Strong-Passw0rd" npm run create-admin
cd ../..
```

`db:migrate` applies the SQL files in `apps/api/database/migrations/` that have not run yet (it records them in `schema_migrations`). `create-admin` creates the first administrator (12+ characters, upper, lower and a digit). For sample data on a development database, `npm run db:seed:dev` in `apps/api` (destructive: it wipes the data first).

### Start both apps

```bash
npm run dev
```

| | |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |
| API documentation | http://localhost:3001/api/docs |
| Admin login | http://localhost:3000/admin/login |

To run just one side, use `npm run start:dev` in `apps/api` or `npm run dev` in `apps/web`.

`npm run dev` at the root also starts the Angular frontend on http://localhost:4300. To run the API with only the Angular frontend, use `npx turbo run dev --filter=api --filter=web-angular`.

### Other commands

| Command | Run from | Purpose |
| --- | --- | --- |
| `npm run build` | root | Build shared package, API, and frontend in order |
| `npm run lint` | root | Lint every workspace |
| `npm run format` | root | Prettier across the repo |
| `npm run db:migrate` / `db:migrate:status` | `apps/api` | Apply / list SQL migrations. A new migration is a new `database/migrations/NNNN_name.sql` file; add any new column to `src/database/schema.ts` too |
| `npm run create-admin` | `apps/api` | Create an administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `npm run db:seed:dev` | `apps/api` | Wipe and load sample applications (development only) |
| `npm run package:deploy` | root | Build and lay out `deploy/api` + `deploy/web` for the shared host (DEPLOYMENT.md, Appendix E) |

> **Note on tests.** The API is wired for Jest (`npm run test`, `npm run test:cov`), but no test suites have been written yet — the commands will report zero tests found. Verification to date has been manual QA against the running application. The Angular frontend has end-to-end checks against the Next.js one in `apps/web-angular/tools/parity` (screenshots, complete user journeys, API calls and accessibility); the header of each script explains how to run it.

---

## Environment variables

Copy `.env.example` to `.env` at the repository root. `.env.server.example` is the equivalent for a production server.

The API reads `.env` from its working directory and falls back to the repository root, so running it from either location works.

**Required — the API refuses to start without these:**

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Minimum 32 characters; use 64 random hex characters in production (`openssl rand -hex 32`) |

**Everything else has a default:**

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | Set to `production` on a server. Also controls cookie security — see the deployment guide |
| `API_PORT` | `3001` | |
| `JWT_EXPIRES_IN` | `8h` | Officer session length |
| `PRESIDENT_LINK_TTL_MS` | `1209600000` | 14 days |
| `WEB_BASE_URL` | `http://localhost:3000` | The only permitted CORS origin, and the base for links in outgoing email |
| `API_BASE_URL` | `http://localhost:3001` | |
| `FROM_EMAIL` | `noreply@fafics.org` | With Gmail this must be the authenticated account or a verified alias on it |
| `SECRETARY_EMAIL` | `secretary@fafics.org` | Recipient for Secretariat notifications |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | `smtp.gmail.com` / `587` in production |
| `SMTP_USER` / `SMTP_PASS` | — | Gmail account and 16-character app password |
| `RESEND_API_KEY` | unset | Leave unset to use SMTP |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@fafics.org` / `changeme123!` | Used by the seed script only |

**Build-time only, set on the machine that builds the frontend:**

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Absolute URL of the API including `/api`. Compiled into the JavaScript bundle and cannot be changed afterwards |
| `NEXT_PUBLIC_BASE_PATH` | Set only when the app is served from a sub-path such as `/fafics` |

---

## Database

The schema covers thirteen tables: `associations`, `users`, `applications`, six child tables holding education, languages, and the four experience histories, `application_expertise`, plus `magic_tokens`, `audit_logs`, and `notification_logs`.

Points worth knowing:

- **Reference numbers and UID numbers are generated inside PostgreSQL**, by `fn_generate_reference_number()` and `fn_generate_uid()`, called within the submission transaction. They are `null` while an application is still a draft.
- **`experience.duration_years` is a `Decimal(4,1)`** in which `99.0` is a sentinel meaning "30+ years". `duration.util.ts` maps it back for display.
- **The sixteen fixed expertise areas use a partial unique index** defined in raw SQL, so repeated saves upsert cleanly. Custom "other" areas are flagged `isCustom = true` and are always inserted.
- **A database trigger caps preferred areas of contribution at three per application**, so the limit holds even if a request bypasses the form.
- **Full-text and trigram indexes** back the roster search. These require the `pg_trgm`, `unaccent`, and `uuid-ossp` extensions, which the migrations create automatically.
- **Two views** — `vw_active_roster` and `vw_dashboard_stats` — serve the roster and overview screens.
- All timestamps are `timestamptz`; date-only fields are `date`.

Migrations live in `apps/api/database/migrations/` and are applied with `npm run db:migrate`, which runs each pending file once, in its own transaction. The API refuses to start while one is pending. The custom functions, triggers, indexes, and views are part of the migrations, so a deployment never requires manually running SQL.

---

## Email

Thirteen email templates cover the application's lifetime: submission confirmation, president review request, president link expired, changes requested, endorsed, Secretariat review pending, approved, rejected, 90-day and 30-day renewal reminders, expiry, applicant edit link, and draft saved link. Two of them — *endorsed* and *Secretariat review pending* — belong to the earlier two-stage approval flow and are no longer triggered now that a president's endorsement approves the application outright; they are kept in place should that step be reinstated.

Delivery goes through `NotificationService`:

- Every send is recorded in `notification_logs`.
- A failure writes `failedAt` and an error message to the log rather than throwing, so a mail outage never blocks an approval or a submission.
- Failed sends are visible in the admin notification screen and can be retried individually.

Transport is chosen at runtime: if a real `RESEND_API_KEY` is present the Resend API is used; otherwise mail goes out over SMTP. Production uses Gmail SMTP. For local development you can run [Mailhog](https://github.com/mailhog/MailHog) and point `SMTP_HOST=localhost` / `SMTP_PORT=1025` at it to inspect mail in a browser without sending anything.

---

## Scheduled maintenance

One cron job runs daily at **02:00 UTC**, inside the API process:

1. **Expire approved profiles** whose three-year validity has elapsed, by calling `fn_expire_applications()`.
2. **Reissue president endorsement links** that expired unused, and email the new link out.
3. **Send renewal reminders** at 90 days and 30 days before expiry.

No separate worker process or scheduler is needed — but the API process must be running at 02:00 UTC for the job to fire, which is a reason to keep it under a process supervisor.

---

## API reference

All routes are prefixed with `/api`. Every successful response is wrapped in `{ "data": ..., "meta": ... }` by a global interceptor — except `/api/health`, which returns raw JSON so uptime probes can read it directly. Interactive documentation is at `/api/docs` when the API is running.

**Public — no authentication**

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check with a database ping |
| `POST` | `/api/applications` | Create a draft |
| `PUT` | `/api/applications/:id` | Auto-save a draft |
| `POST` | `/api/applications/:id/submit` | Submit |
| `GET` | `/api/applications/status` | Check status by email + reference number |
| `POST` | `/api/applications/request-edit-link` | Email an edit link |
| `POST` | `/api/applications/request-draft-link` | Email a draft resume link |
| `GET` | `/api/applications/resume/:token` | Resume from an emailed token |
| `POST` | `/api/applications/request-view-link` | Email a read-only view link for a submitted application |
| `GET` | `/api/applications/view/:token` | Read-only view of the applicant's own application |
| `POST` | `/api/contact` | Contact Us form; emails support@fafics.com (5 per minute per IP) |

**President — single-use token in the URL**

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/endorse/:token` | View the application |
| `POST` | `/api/endorse/:token/endorse` | Endorse and admit to the pool |
| `POST` | `/api/endorse/:token/return` | Return for revision |

**Officers — authenticated**

| Method | Path | Minimum role |
| --- | --- | --- |
| `POST` | `/api/auth/login` · `/api/auth/logout` | — |
| `GET` | `/api/admin/stats` · `/analytics` · `/countries` · `/associations` | committee, management |
| `GET` | `/api/admin/applications` · `/applications/:id` | committee, management |
| `PATCH` | `/api/admin/applications/:id/approve` · `/reject` · `/request-changes` · `/notes` · `/president-email` | secretary |
| `POST` | `/api/admin/applications/:id/remove-from-pool` · `/resend-president-link` | secretary |
| `GET`, `POST` | `/api/admin/export/roster` · `/export/applications` · `/export/application/:id` | secretary, management |
| `GET` | `/api/admin/expiring` | secretary, management |
| `POST` | `/api/admin/reminders/send` | secretary |
| `GET` | `/api/admin/notifications` | secretary |
| `POST` | `/api/admin/notifications/:id/retry` | secretary |
| `GET` | `/api/admin/users` | admin |
| `POST` | `/api/admin/users` | admin |
| `PATCH` | `/api/admin/users/:id/role` | admin |

---

## Angular frontend for shared hosting

`apps/web-angular` is a port of the Next.js frontend to Angular 21. The pages, design, text, validation and behaviour are the same, and so are the URLs. It exists for hosting that can't run a Next.js server, such as the client's MilesWeb cPanel account. `npm run build` in `apps/web-angular` produces static files in `dist/`, including an `.htaccess` for routing, that are uploaded to the domain's document root. The API is unchanged and runs next to them as a cPanel Node.js app at `/api`.

- Develop: `npm run dev` in `apps/web-angular` → http://localhost:4300 (`/api` is proxied to port 3001)
- Build: `npm run build` in `apps/web-angular` → `apps/web-angular/dist/`
- Preview the build as the host serves it: `node tools/preview-dist.mjs` → http://localhost:4400
- API location: set in `apps/web-angular/src/environments/environment.ts` before building (default `/api`, same domain)

Details are in [apps/web-angular/README.md](apps/web-angular/README.md). The shared-hosting deployment is covered in [DEPLOYMENT.md, Appendix D](DEPLOYMENT.md#appendix-d--cpanel-shared-hosting-milesweb-with-the-angular-frontend). Pick **one** frontend per deployment. Both talk to the same API and database.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for server sizing, a step-by-step production install, reverse proxy and HTTPS configuration, backups, and a troubleshooting section. For cPanel shared hosting with the Angular frontend, see [Appendix D](DEPLOYMENT.md#appendix-d--cpanel-shared-hosting-milesweb-with-the-angular-frontend).

Two points are worth flagging before you start, because both are easy to get wrong and neither produces an obvious error message:

1. **The frontend's API URL is compiled into the build.** `NEXT_PUBLIC_API_URL` must be correct *before* `npm run build` runs. It cannot be changed by editing an environment file on the server afterwards.
2. **Officer login requires HTTPS in production.** With `NODE_ENV=production` the session cookie is issued as `Secure`, and browsers refuse to store `Secure` cookies sent over plain HTTP. Serving the admin panel over `http://` will let the login request succeed and then leave the user stuck at the login screen.
