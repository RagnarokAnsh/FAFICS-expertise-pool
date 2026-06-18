# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (Turborepo)
```bash
npm install          # Install all workspace dependencies
npm run dev          # Start all apps in parallel (Next.js + NestJS watch mode)
npm run build        # Build all packages and apps in dependency order
npm run lint         # Lint all packages
npm run format       # Prettier format all TS/JS/JSON/MD files
```

### API (`apps/api`)
```bash
npm run start:dev    # NestJS watch mode (preferred for local dev)
npm run test         # Jest unit tests
npm run test:watch   # Jest watch mode
npm run test:cov     # Jest with coverage
npm run test:e2e     # End-to-end tests (requires running DB)
npm run lint         # ESLint with auto-fix
```

Running a single test file:
```bash
npx jest src/modules/applications/applications.service.spec.ts
```

### Database (`apps/api`)
```bash
npx prisma migrate dev --name <name>   # Create and apply a new migration
npx prisma migrate deploy              # Apply migrations (production)
npx prisma db seed                     # Seed admin user + test association
npx prisma studio                      # Open Prisma Studio GUI
npx prisma generate                    # Regenerate Prisma Client after schema changes
```

### Infrastructure

The app needs a reachable **PostgreSQL 16+** database — set `DATABASE_URL` accordingly. There is no Docker setup; run Postgres via a local install or a managed/remote instance. For local email inspection, optionally run a standalone [Mailhog](https://github.com/mailhog/MailHog) and point `SMTP_HOST`/`SMTP_PORT` at it.

### Web (`apps/web`)
```bash
npm run dev    # Next.js dev server on port 3000
npm run build  # Production build
npm run lint   # ESLint (next lint)
```

## Architecture

### Monorepo Layout
- `apps/api` — NestJS 10 backend, port 3001
- `apps/web` — Next.js 14 (App Router) frontend, port 3000
- `packages/shared` — Shared TypeScript enums and types imported by both apps as `@fafics/shared`

The shared package must be built before the apps (`turbo run build` handles the order). When adding new enums or types, add them to `packages/shared/src/` and re-export from `packages/shared/src/index.ts`.

### NestJS API Module Graph
```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)       ← Singleton PrismaClient
├── AuditModule (global)        ← Append-only audit log
├── AuthModule → TokensModule
├── ApplicationsModule → MailModule, TokensModule
├── EndorsementModule → TokensModule, MailModule
├── AdminModule → ExportModule, MailModule
├── QueueModule → MailModule, TokensModule   ← MaintenanceService + Scheduler (daily cron)
└── HealthModule
```

All API routes are prefixed with `/api` (set globally in `main.ts`). The global `TransformInterceptor` wraps every successful response in `{ data: ..., meta: ... }` — account for this when writing frontend API consumers.

### Auth Model
- **Officers/Admins** authenticate via `POST /api/auth/login` → JWT stored as a cookie. The `@Roles()` decorator + `RolesGuard` enforce RBAC.
- **Presidents** authenticate via a single-use magic link (`/endorse/[rawToken]`). No account required.
- **Applicants** have no login — they track status via email + reference number.

RBAC roles in ascending order of access: `member → president → committee → secretary → admin`.

### Application Lifecycle
```
draft → submitted → endorsed → (under_review) → approved / rejected
                             ↘ changes_requested → (applicant revises) → re-submitted
approved → expired  (automatic daily cron at 02:00 UTC)
```

Each status transition writes an immutable row to `audit_logs`. The `AuditService` exposes only INSERT — never update or delete.

### Notification System
Emails are sent directly (no queue/Redis) via `NotificationService` in `MailModule`:
- `sendEmail(type, applicationId)` — sends standard notifications, writes to `notification_logs`
- `sendPresidentLink(applicationId)` — generates token + sends president review email
- `sendDraftResumeLink(applicationId)` — generates token + sends draft resume email
- All methods are fire-and-log: they catch their own errors and never throw to callers
- Failed sends write `failedAt` + `errorMessage` to `notification_logs` for admin visibility
- Admin retry: `POST /api/admin/notifications/:id/retry` re-attempts a failed notification
- Admin log view: `GET /api/admin/notifications?failedOnly=true`

`MaintenanceService` (in `QueueModule`) handles the daily cron (02:00 UTC):
- `expireApplications()` — calls `fn_expire_applications()`, reissues expired president links
- `sendRenewalReminders()` — sends 90d/30d renewal reminders via `NotificationService`

### Magic Token Security
- Raw token: `crypto.randomBytes(32).toString('hex')` (64 hex chars)
- Only the SHA-256 hash is stored in the DB (`token_hash` column)
- Tokens are single-use: `used_at` is set on first valid consumption
- When a president link expires, the maintenance job reissues a fresh token and sends a `president_link_expired` email

### Auto-Save (Frontend)
`useApplicationForm` + `useAutoSave` work together:
1. On Step 1 completion → `POST /api/applications` creates a draft, returns `{ id }` stored in `localStorage` as `fafics_draft_id`
2. While the form is dirty → debounced `PUT /api/applications/:id` fires every ~30 seconds
3. On step navigation → an immediate forced save fires before advancing

The auto-save payload goes through `sanitizeForApi()` which strips empty strings, `NaN`, and internal fields (`consentData`, `id`, `status`, etc.) before sending to the backend.

### Key Data Model Notes
- `experience.duration_years` uses a `Decimal(4,1)` with `99.0` as a sentinel value meaning "30+ years". The `duration.util.ts` utility maps this for display.
- `ApplicationExpertise` uses a **partial unique index** (in raw SQL, not Prisma) for the fixed expertise areas (`FIXED_EXPERTISE_AREAS` — functional + soft skills). Custom ("Other") rows use `isCustom = true` and are always inserted, never upserted.
- Reference numbers (`EP-NNNN`) and UID numbers are generated by PostgreSQL functions `fn_generate_reference_number()` and `fn_generate_uid()` called inside the submission transaction — they are `null` while status is `draft`.
- All timestamps use `@db.Timestamptz()` (timezone-aware). Date-only fields use `@db.Date`.

### Frontend API Layer
`src/lib/api/client.ts` — Axios instance pointing at `NEXT_PUBLIC_API_URL`. Attaches `Authorization: Bearer <token>` from the `token` cookie on every request. A 401 response redirects to `/admin/login` unless already there.

API modules (`applications.api.ts`, `admin.api.ts`, `endorsement.api.ts`) wrap the Axios client. All calls return the unwrapped `data` field from the `{ data, meta }` envelope.

### Environment Variables
Copy `.env.example` to `.env` at the repo root. Key variables:
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — Must be a 64-char random string in production
- `RESEND_API_KEY` — Transactional email provider
- `NEXT_PUBLIC_API_URL` — Browser-visible API URL

### Swagger
Available at `http://localhost:3001/api/docs` when the API is running.

### Email Delivery

The API uses Resend only when a real `RESEND_API_KEY` is set (the Joi default `re_test` counts as "not set"); otherwise it sends via the SMTP settings (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`) — Gmail in production. For local dev you can run a standalone Mailhog and set `SMTP_HOST=localhost` / `SMTP_PORT=1025` to capture mail at `http://localhost:8025`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
