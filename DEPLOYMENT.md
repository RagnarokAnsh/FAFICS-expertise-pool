# Deployment Guide

This project is a Turborepo monorepo:

- **`apps/api`** — NestJS API (port `3001`). Runs on the server.
- **`apps/web`** — Next.js 14 frontend (port `3000`). Built **locally**, then shipped to the server.
- **`packages/shared`** — shared TS types/enums (`@fafics/shared`), built before the apps.

The frontend production build is memory-heavy, so it is built off-server (e.g. a laptop) and shipped as a self-contained `standalone` bundle. The API is built and run on the t3.micro server.

---

## A. NestJS API — on the t3.micro server

```bash
npm install
npm run build                 # turbo builds @fafics/shared then the API
npx prisma migrate deploy     # apply DB migrations
npx prisma db seed            # FIRST deploy only — seeds admin user + association
NODE_ENV=production node apps/api/dist/main
```

The API listens on `API_PORT` (default `3001`) and serves all routes under `/api`. Health check: `GET /api/health` → `{ "status": "ok" }`.

> Keep-alive (auto-restart on crash/reboot) is left to the operator — run the
> last command under `pm2`, a `systemd` unit, `tmux`, or similar.

### Required server environment (`.env` at the repo root)

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | 64-char random string |
| `NODE_ENV` | `production` |
| `API_PORT` | `3001` |
| `WEB_BASE_URL` | Origin the browser loads the frontend from — used for CORS (see note below) |
| `FROM_EMAIL` | Gmail sends as the authenticated account, so set this to that account/alias |
| `SECRETARY_EMAIL` | Secretary notification recipient |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `587` |
| `SMTP_USER` / `SMTP_PASS` | Gmail account + 16-char app password |

**Email transport:** the API uses Resend only when a **real** `RESEND_API_KEY` is set; otherwise it sends via the SMTP settings above. For Gmail delivery, **leave `RESEND_API_KEY` unset/commented**.

**CORS note:** the API allows only `WEB_BASE_URL` as a cross-origin origin (with credentials, for cookie-based admin login). Set `WEB_BASE_URL` to wherever the browser actually loads the frontend — `http://localhost:3000` while you test the locally-built frontend against the server, then the final frontend URL once it is shipped.

---

## B. Next.js frontend — build locally, then ship

`NEXT_PUBLIC_API_URL` is **inlined at build time**, so it must point at the target API *before* you build.

```bash
npm install
# PowerShell:  $env:NEXT_PUBLIC_API_URL = "http://<SERVER_IP>:3001/api"
# bash:        export NEXT_PUBLIC_API_URL="http://<SERVER_IP>:3001/api"
npm run build                 # turbo builds shared -> api -> web (standalone)
```

The self-contained output is `apps/web/.next/standalone/`. `standalone` does **not** include static assets or the `public/` folder, so copy them in:

```text
apps/web/.next/static   ->  apps/web/.next/standalone/apps/web/.next/static
apps/web/public         ->  apps/web/.next/standalone/apps/web/public
```

PowerShell:

```powershell
Copy-Item -Recurse -Force apps/web/.next/static  apps/web/.next/standalone/apps/web/.next/static
Copy-Item -Recurse -Force apps/web/public        apps/web/.next/standalone/apps/web/public
```

Run it (locally to test, or on the server after shipping the `standalone/` folder):

```bash
cd apps/web/.next/standalone
node apps/web/server.js        # serves on PORT (default 3000)
```

To test against the server API from your laptop, make sure the server's `WEB_BASE_URL` matches your laptop origin (`http://localhost:3000`) so admin login works. Then ship the same `standalone/` folder to the server and run it there.

---

## C. Database & email

- **Database:** provide a reachable PostgreSQL 16+ instance and point `DATABASE_URL` at it. On first deploy run `npx prisma migrate deploy` then `npx prisma db seed` (see section A).
- **Email:** delivery goes through Gmail SMTP (leave `RESEND_API_KEY` unset). For local mail inspection during development, optionally run a standalone [Mailhog](https://github.com/mailhog/MailHog) and set `SMTP_HOST=localhost` / `SMTP_PORT=1025`.
