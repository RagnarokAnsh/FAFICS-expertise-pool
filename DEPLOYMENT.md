# Deployment Guide

This project is a Turborepo monorepo:

- **`apps/api`** — NestJS API (port `3001`). Runs on the server.
- **`apps/web`** — Next.js 14 frontend (port `3000`). Built **locally**, then shipped to the server.
- **`packages/shared`** — shared TS types/enums (`@fafics/shared`), built before the apps.

---

## A. NestJS API — server

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

---

## D. Behind a reverse proxy at a sub-path (e.g. `http://HOST/fafics`)

This is the recommended production topology: one origin, nginx in front, API and
frontend on the same host. Because the API is then **same-origin** with the
frontend, there is **no CORS** to fight.

**1. Build the frontend with the sub-path and a same-origin API URL.** Both are
inlined at build time:

```bash
# example for host 43.204.47.253 served under /fafics
export NEXT_PUBLIC_BASE_PATH=/fafics                       # PowerShell: $env:NEXT_PUBLIC_BASE_PATH="/fafics"
export NEXT_PUBLIC_API_URL=http://43.204.47.253/fafics/api # PowerShell: $env:NEXT_PUBLIC_API_URL="..."
npm run build
```

Then copy `static` + `public` into the standalone output (section B) and run it
(`node apps/web/server.js`, listens on port 3000).

**2. nginx — proxy both under the sub-path** (the API location must come first):

```nginx
# API → NestJS on :3001  (strips /fafics, forwards /api/*)
location /fafics/api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Frontend → Next standalone on :3000  (keeps the /fafics prefix)
location /fafics/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**3. API `.env`:** set `WEB_BASE_URL=http://43.204.47.253/fafics` so the magic-link
emails (endorsement / draft-resume) point at the correct sub-path. Restart the API.

## Common gotchas (what breaks a sub-path deploy)

- **Login shows a CORS error / requests go to `localhost:3001`** → the frontend was
  built without `NEXT_PUBLIC_API_URL`, so it fell back to the localhost default.
  Rebuild with the real value; it cannot be changed after the build.
- **Logo / styles 404** → `standalone` doesn't bundle `public/` or `.next/static`;
  copy both into the standalone folder (section B), and make sure
  `NEXT_PUBLIC_BASE_PATH` was set so asset URLs carry the `/fafics` prefix.
- **Pages 404 under the sub-path** → `NEXT_PUBLIC_BASE_PATH` was not set at build, or
  nginx strips the `/fafics` prefix before proxying to the Next server (it must keep
  it — note `proxy_pass http://localhost:3000` with no trailing path).
- **Always use the server's IP/domain, never `localhost`,** in the two build-time URLs
  and in `WEB_BASE_URL` — `localhost` only resolves correctly when browsing from the
  server itself.
