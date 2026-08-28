# FAFICS Expertise Pool — Deployment Guide

This document covers what the system needs to run in production, how to size a server for it, and how to install, configure, secure, back up, and update it.

It assumes a single Linux server running both application processes and PostgreSQL behind nginx. That is the recommended topology for this workload; alternatives are covered in [Appendix B](#appendix-b--alternative-topologies).

---

## Contents

1. [What gets deployed](#1-what-gets-deployed)
2. [Sizing the server](#2-sizing-the-server)
3. [Prerequisites](#3-prerequisites)
4. [Installation](#4-installation)
5. [Configuration](#5-configuration)
6. [Database setup](#6-database-setup)
7. [Building the applications](#7-building-the-applications)
8. [Running as services](#8-running-as-services)
9. [nginx and HTTPS](#9-nginx-and-https)
10. [Email setup](#10-email-setup)
11. [Post-deployment verification](#11-post-deployment-verification)
12. [Backups](#12-backups)
13. [Updating a running deployment](#13-updating-a-running-deployment)
14. [Monitoring and logs](#14-monitoring-and-logs)
15. [Security checklist](#15-security-checklist)
16. [Troubleshooting](#16-troubleshooting)
- [Appendix A — sub-path deployment](#appendix-a--sub-path-deployment)
- [Appendix B — alternative topologies](#appendix-b--alternative-topologies)
- [Appendix C — environment variable reference](#appendix-c--environment-variable-reference)

---

## 1. What gets deployed

Three build outputs come from one repository:

| Component | Built from | Runs as | Port |
| --- | --- | --- | --- |
| **API** | `apps/api` | `node apps/api/dist/main` | 3001 |
| **Frontend** | `apps/web` | `node apps/web/server.js` inside the standalone bundle | 3000 |
| **Shared types** | `packages/shared` | Compiled into both of the above | — |

Neither process is reachable from the internet directly. nginx terminates TLS on port 443 and forwards to them.

```
                    ┌──────────────────────────────────────────────┐
   Internet ──443──►│  nginx                                       │
                    │    /api/*  ──► 127.0.0.1:3001   NestJS API   │
                    │    /*      ──► 127.0.0.1:3000   Next.js      │
                    └──────────────────┬───────────────────────────┘
                                       │
                                 127.0.0.1:5432
                                  PostgreSQL 16
```

There is no Redis, no message broker, no container runtime, and no separate worker process. The nightly maintenance job runs on a timer inside the API process.

Deployable artefact sizes, measured from a clean build:

| | Size |
| --- | --- |
| API compiled output (`apps/api/dist`) | 1.3 MB |
| Shared package (`packages/shared/dist`) | 91 KB |
| Frontend standalone bundle | 37 MB |
| Frontend static assets + public folder | 2 MB |

The bulk of the disk requirement is `node_modules` on the API side, not the build output.

---

## 2. Sizing the server

### The workload

Sizing is driven by the expected volume of **100–200 applications per year**.

| | |
| --- | --- |
| New applications | 100–200 per year — fewer than one per working day |
| Concurrent public users | Typically 1–3; a handful at most during a membership drive |
| Concurrent officers | 2–5 |
| Requests per application | ~40–80, mostly small auto-save writes while the form is open |
| Rows added per application | ~30 across the parent and child tables |
| Database growth | Roughly 6,000 rows and well under 100 MB per year, including audit and notification logs |
| Active roster after 3 years | 300–600 approved profiles (three-year validity, so the pool reaches a steady state) |

This is a very small workload by web-application standards. **The sizing constraint is memory footprint at idle, not throughput.** Two Node processes and a PostgreSQL instance need to coexist comfortably; CPU sits near zero almost all the time.

### Where the memory goes

| Component | Typical resident memory |
| --- | --- |
| NestJS API | 150–250 MB |
| Next.js standalone server | 100–200 MB |
| PostgreSQL 16 (default configuration) | 150–300 MB |
| nginx | 10–20 MB |
| Operating system and services | 200–400 MB |
| **Steady-state total** | **~700 MB – 1.2 GB** |

Two operations push above steady state:

- **Full roster Excel export.** ExcelJS assembles the entire workbook in memory before streaming it. At a few hundred approved profiles across eight worksheets this is a transient spike of roughly 50–150 MB. Allow headroom for it.
- **Building the frontend.** `next build` is by far the most memory-hungry step and can want 2–4 GB. This is why the recommended procedure builds the frontend on a workstation or CI runner rather than on the server.

### Recommended specification

| | Minimum | **Recommended** | Comfortable |
| --- | --- | --- | --- |
| vCPU | 1 | **2** | 2–4 |
| RAM | 1 GB + 2 GB swap | **2 GB** | 4 GB |
| Disk (SSD) | 20 GB | **25 GB** | 40 GB |
| Bandwidth | 100 GB/month | 500 GB/month | — |
| OS | Ubuntu 22.04 LTS or Debian 12 | Ubuntu 24.04 LTS | — |

**Go with 2 GB.** At 1 GB the system runs, but there is no margin: a full-roster export while an officer is browsing the dashboard can push the box into swap, and any future addition (a monitoring agent, an on-server backup job) eats the remaining space. The difference in cost between a 1 GB and a 2 GB instance is a few dollars a month and it removes an entire class of intermittent problem.

**Choose 4 GB if** you intend to build the frontend on the server itself rather than shipping a pre-built bundle, or if you want PostgreSQL configured with a larger cache.

Disk is sized mainly by `node_modules` — about 1 GB for the monorepo with development dependencies installed, which the server needs in order to build the API and run the Prisma CLI — plus the operating system, logs, and room for backups. The application data itself will not approach a gigabyte for many years.

### Concrete options

| Provider | Instance | Specification | Approximate monthly cost |
| --- | --- | --- | --- |
| Hetzner Cloud | CX22 | 2 vCPU, 4 GB, 40 GB | €4–5 |
| DigitalOcean | Basic Droplet | 2 vCPU, 2 GB, 60 GB | $18 |
| DigitalOcean | Basic Droplet | 1 vCPU, 2 GB, 50 GB | $12 |
| AWS | t3.small + 25 GB gp3 | 2 vCPU, 2 GB | ~$18 on demand, ~$11 reserved |
| AWS | t3.micro + 20 GB gp3 | 2 vCPU, 1 GB | ~$9 — minimum viable, add swap |
| Azure | B1ms | 1 vCPU, 2 GB | ~$15 |
| Linode / Akamai | Nanode 2 GB | 1 vCPU, 2 GB | $12 |

Costs are indicative as of the time of writing and exclude the domain name and any backup add-on.

If you prefer a managed database rather than PostgreSQL on the same box, AWS RDS `db.t4g.micro`, DigitalOcean Managed PostgreSQL, or Neon all comfortably handle this workload. The application server can then drop to 1 GB. This adds roughly $15–25 per month and buys you automated backups, point-in-time recovery, and patching. For an organisation without dedicated technical staff, that trade is usually worth making.

### Recommended sizing summary

For 100–200 applications per year, the sensible configuration is:

> **One 2 vCPU / 2 GB / 25 GB SSD Linux server** running the API, the frontend, PostgreSQL 16, and nginx, with a registered domain name, a Let's Encrypt certificate, and a nightly `pg_dump` copied off the machine.

---

## 3. Prerequisites

Before starting, have these ready:

| | |
| --- | --- |
| Server | Provisioned, with SSH access and a static public IP |
| Domain name | Pointed at that IP by an `A` record — for example `experts.fafics.org` |
| Gmail account | With two-factor authentication enabled and a 16-character App Password generated |
| Secretariat email address | The address that should receive Secretariat notifications |

**A domain name and HTTPS are required, not optional.** In production the officer session cookie is issued with the `Secure` and `SameSite=None` attributes. Browsers refuse to store `Secure` cookies delivered over plain HTTP, so an admin panel served over `http://` will accept the login request and then bounce the user straight back to the login screen with no visible error. There is no configuration flag to work around this — put a certificate in front of it.

Software to be installed on the server (covered in the next section):

- Node.js 20 or later — Node 22 LTS is what the project is currently built and run against
- PostgreSQL 16 or later
- nginx
- certbot, for Let's Encrypt certificates
- git

---

## 4. Installation

All commands assume Ubuntu 22.04/24.04 as the `root` user or with `sudo`.

### 4.1 System packages

```bash
apt update && apt upgrade -y
apt install -y curl git nginx ufw
```

### 4.2 Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v    # expect v22.x
npm -v     # expect 10.x or later
```

### 4.3 PostgreSQL 16

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
psql --version    # confirm 16 or later
```

If the distribution's default is older than 16, use the PostgreSQL Apt repository:

```bash
apt install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
apt install -y postgresql-16
```

### 4.4 Firewall

Only SSH and HTTP/HTTPS should be reachable. The application ports and PostgreSQL stay on localhost.

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 4.5 Application user and directory

Do not run the application as root.

```bash
adduser --system --group --home /opt/fafics fafics
mkdir -p /opt/fafics/app
chown -R fafics:fafics /opt/fafics
```

### 4.6 Swap (only if the server has 1 GB of RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 5. Configuration

### 5.1 Get the code onto the server

```bash
su - fafics -s /bin/bash
cd /opt/fafics/app
git clone <repo-url> .
npm install
```

`npm install` on a 1 GB server can be slow. It completes, but allow several minutes.

### 5.2 Create the environment file

The API reads `.env` from its working directory and falls back to the repository root, so a single file at `/opt/fafics/app/.env` covers it.

```bash
cp .env.server.example .env
nano .env
```

Generate a JWT secret with:

```bash
openssl rand -hex 32
```

A complete production `.env`, with the placeholders in angle brackets replaced:

```ini
NODE_ENV=production
API_PORT=3001

DATABASE_URL=postgresql://fafics_user:<DB_PASSWORD>@localhost:5432/fafics_db

JWT_SECRET=<64_HEX_CHARS_FROM_OPENSSL>
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

PRESIDENT_LINK_TTL_MS=1209600000
EMAIL_VERIFY_TTL_MS=86400000
PASSWORD_RESET_TTL_MS=3600000

API_BASE_URL=https://experts.fafics.org
WEB_BASE_URL=https://experts.fafics.org

FROM_EMAIL="FAFICS Expertise Pool <fafics.experts@gmail.com>"
SECRETARY_EMAIL=secretary@fafics.org

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=fafics.experts@gmail.com
SMTP_PASS=<GMAIL_16_CHAR_APP_PASSWORD>

ADMIN_EMAIL=admin@fafics.org
ADMIN_PASSWORD=<STRONG_INITIAL_PASSWORD>
```

Lock the file down — it contains the database password, the JWT secret, and the mail credentials:

```bash
chmod 600 /opt/fafics/app/.env
```

Three settings deserve particular attention:

- **`WEB_BASE_URL`** does double duty. It is the only origin the API permits for cross-origin requests, and it is the base for every link in outgoing email. If it is wrong, either the admin panel stops working or applicants receive links that go nowhere.
- **`FROM_EMAIL`** must be the authenticated Gmail account or a verified alias on it. Gmail rewrites the `From` header otherwise.
- **`RESEND_API_KEY`** must stay unset or commented out. Setting it switches the mail transport away from SMTP.

---

## 6. Database setup

### 6.1 Create the role and database

```bash
sudo -u postgres psql
```

```sql
CREATE USER fafics_user WITH PASSWORD 'a-strong-password-here';
CREATE DATABASE fafics_db OWNER fafics_user;
GRANT ALL PRIVILEGES ON DATABASE fafics_db TO fafics_user;
\c fafics_db
GRANT ALL ON SCHEMA public TO fafics_user;
\q
```

The migrations create the `uuid-ossp`, `pg_trgm`, and `unaccent` extensions. Creating extensions normally requires superuser rights. On a self-hosted PostgreSQL the simplest approach is to create them once as `postgres` before running the migrations:

```bash
sudo -u postgres psql -d fafics_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "unaccent";'
```

The migration statements use `IF NOT EXISTS`, so they will pass over them harmlessly afterwards.

On managed PostgreSQL (RDS, DigitalOcean, Neon) all three extensions are on the allow-list and the migration creates them without intervention.

### 6.2 Apply the schema

```bash
cd /opt/fafics/app/apps/api
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies every pending migration in order and creates the tables, enums, indexes, the `fn_generate_reference_number`, `fn_generate_uid`, `fn_expire_applications`, `check_max_preferred_areas`, and `fn_set_updated_at` functions, the associated triggers, the full-text and trigram indexes, and the `vw_active_roster` and `vw_dashboard_stats` views. No manual SQL is required.

### 6.3 Seed the first administrator

**First deployment only.**

```bash
npx prisma db seed
```

This creates one administrator account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and a placeholder association record. Sign in with those credentials, then create the real officer accounts through the admin panel and change the initial password.

### 6.4 PostgreSQL tuning (optional)

The defaults are fine for this workload. On a 2 GB server, if you want to give the database a little more cache, edit `/etc/postgresql/16/main/postgresql.conf`:

```ini
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 8MB
maintenance_work_mem = 128MB
max_connections = 50
```

Restart with `systemctl restart postgresql`. Do not raise `shared_buffers` beyond about a quarter of total RAM on a shared box.

---

## 7. Building the applications

`packages/shared` must be built before either app; `turbo run build` handles that ordering automatically.

The important constraint is that **`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_BASE_PATH` are compiled into the frontend JavaScript bundle**. They are read at build time and baked in. Changing them on the server afterwards has no effect — the frontend must be rebuilt.

### Option A — build on a workstation and ship the result (recommended)

This keeps the build's memory demand off a small server and gives you a reproducible artefact.

On the machine doing the build, from a clean checkout:

```bash
npm install
export NEXT_PUBLIC_API_URL="https://experts.fafics.org/api"
npm run build
```

On Windows PowerShell, set the variable with `$env:NEXT_PUBLIC_API_URL = "https://experts.fafics.org/api"`.

A full build takes roughly 4–5 minutes.

The frontend output lands in `apps/web/.next/standalone/`, but Next.js deliberately excludes static assets and the public folder from it. Copy both in before shipping:

```bash
cp -r apps/web/.next/static  apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public        apps/web/.next/standalone/apps/web/public
```

PowerShell equivalent:

```powershell
Copy-Item -Recurse -Force apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
Copy-Item -Recurse -Force apps/web/public       apps/web/.next/standalone/apps/web/public
```

Then transfer the bundle to the server:

```bash
rsync -avz --delete apps/web/.next/standalone/ fafics@<SERVER>:/opt/fafics/web/
```

The API is small enough to build on the server, so only the frontend needs shipping. If you would rather ship both, `apps/api/dist` and `packages/shared/dist` transfer the same way — but the server still needs `node_modules` and a generated Prisma client for the API to run.

### Option B — build everything on the server

Viable on 4 GB. On 2 GB it usually succeeds with swap enabled; on 1 GB expect the Next.js build to be killed by the out-of-memory reaper.

```bash
cd /opt/fafics/app
export NEXT_PUBLIC_API_URL="https://experts.fafics.org/api"
npm run build
cp -r apps/web/.next/static  apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public        apps/web/.next/standalone/apps/web/public
```

If the build is killed, raise Node's heap ceiling and retry:

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

---

## 8. Running as services

Both processes must restart automatically after a crash or a reboot. systemd handles this and gives you log integration for free.

The nightly maintenance job — expiring profiles, reissuing lapsed president links, sending renewal reminders — runs on a timer inside the API process at 02:00 UTC. **If the API is not running at that moment, that day's maintenance does not happen.** Keeping it under a supervisor is therefore functionally important, not just convenient.

### 8.1 API service

Create `/etc/systemd/system/fafics-api.service`:

```ini
[Unit]
Description=FAFICS Expertise Pool API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=fafics
Group=fafics
WorkingDirectory=/opt/fafics/app
EnvironmentFile=/opt/fafics/app/.env
ExecStart=/usr/bin/node apps/api/dist/main
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fafics-api

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/fafics

[Install]
WantedBy=multi-user.target
```

The working directory must be the repository root so the API resolves `.env` and the Prisma client correctly.

### 8.2 Frontend service

Create `/etc/systemd/system/fafics-web.service`:

```ini
[Unit]
Description=FAFICS Expertise Pool Frontend
After=network.target

[Service]
Type=simple
User=fafics
Group=fafics
WorkingDirectory=/opt/fafics/web
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node apps/web/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fafics-web

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

`HOSTNAME=127.0.0.1` binds the Next.js server to loopback so it is reachable only through nginx.

If you built on the server rather than shipping a bundle, point `WorkingDirectory` at `/opt/fafics/app/apps/web/.next/standalone` instead.

### 8.3 Enable and start

```bash
systemctl daemon-reload
systemctl enable --now fafics-api fafics-web
systemctl status fafics-api fafics-web
```

Confirm both are listening:

```bash
curl -s http://127.0.0.1:3001/api/health
curl -sI http://127.0.0.1:3000/
```

The health endpoint returns `{"status":"ok","info":{"database":{"status":"up"}}}`. It pings the database, so a successful response confirms the connection string works too. It is deliberately exempt from both the response envelope and the rate limiter, so it is safe to poll from an uptime monitor.

---

## 9. nginx and HTTPS

### 9.1 Server block

Create `/etc/nginx/sites-available/fafics`:

```nginx
server {
    listen 80;
    server_name experts.fafics.org;

    # certbot will add the redirect to HTTPS here.

    client_max_body_size 10M;

    # API — must be declared before the catch-all location.
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;    # full-roster Excel export can take a while
    }

    # Frontend.
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it and reload:

```bash
ln -s /etc/nginx/sites-available/fafics /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

The `X-Forwarded-*` headers matter. The API trusts the first proxy hop, so the rate limiter and the request logs record the real client address rather than `127.0.0.1` — without them, one visitor hitting the rate limit would lock out everyone.

`proxy_read_timeout 120s` on the API location covers the full-roster export, which builds the whole workbook before sending it.

### 9.2 TLS certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d experts.fafics.org
```

Choose the option to redirect HTTP to HTTPS. certbot rewrites the server block, installs the certificate, and registers a renewal timer. Verify renewal works:

```bash
certbot renew --dry-run
systemctl list-timers | grep certbot
```

### 9.3 After the certificate is issued

The site is now on `https://`. Confirm the environment file matches:

```ini
API_BASE_URL=https://experts.fafics.org
WEB_BASE_URL=https://experts.fafics.org
```

Restart the API so it picks up the change, and make sure the frontend was built with the `https://` API URL:

```bash
systemctl restart fafics-api
```

If the frontend was built pointing at `http://`, rebuild it. Mixed-content rules will otherwise block every API call from the browser.

---

## 10. Email setup

Production mail goes out over Gmail SMTP. Resend is supported as an alternative but is not used by default — leaving `RESEND_API_KEY` unset selects the SMTP transport.

### Gmail App Password

1. Sign in to the Google account that will send the mail.
2. Enable two-factor authentication — App Passwords are unavailable without it.
3. Go to **Google Account → Security → 2-Step Verification → App passwords**.
4. Generate a password for "Mail". Google shows a 16-character string.
5. Put that string in `SMTP_PASS`, with no spaces.

Set `FROM_EMAIL` to the same account, or to an alias verified on it. Gmail rewrites the `From` header to the authenticated account otherwise, which is confusing for recipients and harmful to deliverability.

### Delivery considerations

Gmail limits a standard account to roughly 500 messages per day. At 100–200 applications per year — each generating a handful of notifications — the ceiling is nowhere near reached.

The system never blocks on mail. `NotificationService` catches its own errors, records the failure with a timestamp and message in `notification_logs`, and returns. An approval or a submission always completes even if the mail server is unreachable. Failed sends appear in the admin notification screen and can be retried individually from there.

If deliverability becomes a problem — messages landing in spam, or the organisation wanting mail sent from an `@fafics.org` address — move to a transactional provider with a properly configured sending domain (SPF, DKIM, DMARC). Resend is already supported: set a real `RESEND_API_KEY` and restart the API, and the transport switches with no code change.

---

## 11. Post-deployment verification

Work through this list on the live URL before handing the system over.

**Infrastructure**

- [ ] `https://experts.fafics.org` loads with a valid certificate and no browser warning
- [ ] `https://experts.fafics.org/api/health` returns `status: ok`
- [ ] `http://` redirects to `https://`
- [ ] `systemctl status fafics-api fafics-web` — both active
- [ ] Reboot the server; confirm both services come back automatically
- [ ] Ports 3000, 3001, and 5432 are **not** reachable from outside

**Application flow**

- [ ] Complete and submit a test application end to end
- [ ] The draft auto-saves — reload mid-form and confirm the data is still there
- [ ] The submission confirmation email arrives, and carries a reference number
- [ ] The president receives the endorsement email and the link opens the review page
- [ ] Endorsing the application admits it to the Expertise Pool
- [ ] Returning an application for changes emails the applicant a working edit link
- [ ] Status lookup at `/status` works with the email address and reference number

**Admin panel**

- [ ] Officer login succeeds — and, critically, the session survives navigating to another page
- [ ] The dashboard shows counts and renders its charts
- [ ] Applications list, filters, and detail view all work
- [ ] Full roster Excel export downloads and opens correctly in Excel
- [ ] Single application export downloads and opens correctly
- [ ] Creating an officer account works, and the new account can sign in
- [ ] The notification log lists the emails sent during this test

**Housekeeping**

- [ ] The seeded administrator password has been changed
- [ ] A backup has been taken and a restore has been tested
- [ ] `SECRETARY_EMAIL` points at a mailbox someone actually reads

If officer login appears to succeed and then immediately returns to the login page, the session cookie is being rejected. See [Troubleshooting](#16-troubleshooting).

---

## 12. Backups

The database is the only irreplaceable thing on the server. Everything else can be rebuilt from the repository.

### Nightly dump

Create `/opt/fafics/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/opt/fafics/backups
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

PGPASSWORD='<DB_PASSWORD>' pg_dump \
  -h localhost -U fafics_user -d fafics_db -F c \
  -f "$BACKUP_DIR/fafics-$STAMP.dump"

# Keep 30 days.
find "$BACKUP_DIR" -name 'fafics-*.dump' -mtime +30 -delete
```

```bash
chmod 700 /opt/fafics/backup.sh
chown fafics:fafics /opt/fafics/backup.sh
```

Schedule it as the `fafics` user, at 01:00 UTC — before the application's own 02:00 maintenance run:

```bash
crontab -u fafics -e
```

```cron
0 1 * * * /opt/fafics/backup.sh >> /opt/fafics/backups/backup.log 2>&1
```

### Copy the backups off the machine

A backup on the same disk as the database protects against nothing more than a bad `DELETE`. Copy it somewhere else — object storage, another server, or a workstation:

```bash
# Example: sync to S3-compatible object storage
aws s3 sync /opt/fafics/backups s3://fafics-backups/db/ --delete
```

Also keep a copy of `/opt/fafics/app/.env` somewhere secure and separate. It holds the JWT secret and the mail credentials, and it is not in version control.

### Restoring

```bash
systemctl stop fafics-api fafics-web
sudo -u postgres dropdb fafics_db
sudo -u postgres createdb -O fafics_user fafics_db
sudo -u postgres psql -d fafics_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pg_trgm"; CREATE EXTENSION IF NOT EXISTS "unaccent";'
PGPASSWORD='<DB_PASSWORD>' pg_restore -h localhost -U fafics_user -d fafics_db /opt/fafics/backups/fafics-<STAMP>.dump
systemctl start fafics-api fafics-web
```

**Test this at least once before going live.** An untested backup is a guess.

---

## 13. Updating a running deployment

### API-only change

```bash
su - fafics -s /bin/bash
cd /opt/fafics/app
git pull
npm install
npx prisma generate
npx prisma migrate deploy      # only if migrations were added
npm run build
exit

systemctl restart fafics-api
```

### Frontend change

Rebuild on the workstation with the correct `NEXT_PUBLIC_API_URL`, copy `static` and `public` into the standalone folder, and rsync it across:

```bash
rsync -avz --delete apps/web/.next/standalone/ fafics@<SERVER>:/opt/fafics/web/
ssh <SERVER> 'systemctl restart fafics-web'
```

### Before any update that includes a migration

```bash
/opt/fafics/backup.sh
```

Migrations are applied forward only. `prisma migrate deploy` has no rollback — recovering from a bad migration means restoring the dump.

### Expected downtime

Restarting either service takes a few seconds. For a routine update, a brief interruption outside working hours is usually acceptable and simpler than arranging zero-downtime deployment for a system with this traffic profile.

---

## 14. Monitoring and logs

Both services log to the systemd journal through Pino.

```bash
journalctl -u fafics-api -f              # follow the API
journalctl -u fafics-web -f              # follow the frontend
journalctl -u fafics-api --since today   # today only
journalctl -u fafics-api -p err          # errors only
```

Cap journal disk usage in `/etc/systemd/journald.conf`:

```ini
SystemMaxUse=500M
MaxRetentionSec=1month
```

Then `systemctl restart systemd-journald`.

nginx access and error logs are at `/var/log/nginx/`, rotated by logrotate by default.

### What to keep an eye on

| Signal | How to check | Why it matters |
| --- | --- | --- |
| Health endpoint | `curl https://experts.fafics.org/api/health` | Covers the API and the database in one request |
| Failed emails | Admin panel → notification log, filtered to failures | The likeliest silent failure; applicants stop hearing back |
| Nightly maintenance | `journalctl -u fafics-api --since "02:00" \| grep -i maintenance` | Expiry and renewal reminders depend on it |
| Disk space | `df -h` | Backups and logs are what grow |
| Memory | `free -h` | Sustained swap use means it is time to resize |
| Certificate expiry | `certbot certificates` | Auto-renewal is reliable but worth confirming quarterly |

An external uptime check against `/api/health` — UptimeRobot, Better Stack, or a similar free service — is the single highest-value addition. It tells you the site is down before a user does.

---

## 15. Security checklist

The application ships with a reasonable baseline. Confirm each of these is actually in place on the deployed system.

**Already handled by the application**

- Passwords hashed with bcrypt at 12 rounds
- Session JWT held in an `HttpOnly`, `Secure`, `SameSite=None` cookie, unreadable by JavaScript
- Login limited to 5 attempts per minute per IP; email-sending endpoints likewise; everything else 100 per minute
- Helmet security headers on every response
- CORS restricted to the single `WEB_BASE_URL` origin
- Every request body validated and stripped of unknown fields before it reaches a handler
- All database access through Prisma's parameterised queries
- Magic tokens stored only as SHA-256 hashes, single-use, with a 14-day expiry
- Every status change written to an append-only audit log

**Your responsibility on the server**

- [ ] `JWT_SECRET` is 64 random hex characters, generated for this deployment and never reused
- [ ] The seeded `changeme123!` administrator password has been replaced
- [ ] `.env` is `chmod 600` and owned by the application user
- [ ] The application runs as `fafics`, not as root
- [ ] PostgreSQL listens on localhost only, with a strong password on `fafics_user`
- [ ] `ufw` permits only SSH, 80, and 443
- [ ] SSH uses key authentication with password login disabled
- [ ] HTTPS is enforced and certificate auto-renewal is verified
- [ ] Officer accounts are individually named — no shared logins, so the audit trail identifies a person
- [ ] `unattended-upgrades` is enabled for security patches
- [ ] Backups are copied off the machine and a restore has been tested

The application handles personal data — names, dates of birth, nationalities, contact details, employment history. Treat access to the server and to the database as access to that data, and grant it accordingly.

---

## 16. Troubleshooting

### Officer login succeeds, then bounces straight back to the login page

The single most common deployment failure. The API returns 200 to the login request, but the browser refuses to store the session cookie, so the next request arrives unauthenticated and the frontend redirects to login.

With `NODE_ENV=production` the cookie carries `Secure` and `SameSite=None`, and browsers require HTTPS for both.

- Confirm the site is served over `https://`, not `http://`
- Confirm `WEB_BASE_URL` in `.env` exactly matches the origin in the address bar, scheme included, with no trailing slash
- Confirm the frontend was built with an `https://` `NEXT_PUBLIC_API_URL`
- In the browser's developer tools, look at the login response: if `Set-Cookie` is present but no cookie is stored, this is the cause

### The frontend calls `localhost:3001` instead of the server

`NEXT_PUBLIC_API_URL` was not set when the frontend was built, so it fell back to the development default. The value is compiled into the bundle and cannot be corrected on the server. Rebuild with the variable set and redeploy.

### CORS errors in the browser console

`WEB_BASE_URL` does not match the origin the browser is actually using. It is the only permitted origin. Compare it character for character — `https://` versus `http://`, `www.` versus bare domain, and any trailing slash all count. Restart the API after changing it.

### Logo, fonts, or styles return 404

The standalone bundle does not include `.next/static` or `public/`. Copy both into it after building, as in [section 7](#7-building-the-applications).

### The API will not start

Check `journalctl -u fafics-api -n 50`.

- *`JWT_SECRET is required` or a Joi validation error* — a required variable is missing or too short. `JWT_SECRET` must be at least 32 characters.
- *`Can't reach database server`* — PostgreSQL is not running, or `DATABASE_URL` is wrong. Test with `psql "$DATABASE_URL" -c 'select 1'`.
- *`@prisma/client did not initialize`* — run `npx prisma generate` in `apps/api`.
- *`EADDRINUSE`* — something already holds port 3001. `ss -tlnp | grep 3001`.

### Emails are not arriving

- Check the admin notification log first — it records every attempt and the error text of any failure
- Confirm `SMTP_PASS` is a Gmail **App Password**, not the account password
- Confirm two-factor authentication is enabled on the Google account
- Confirm `RESEND_API_KEY` is unset — a value there switches the transport away from SMTP
- Check the spam folder before assuming a send failed
- Test the port from the server: `nc -zv smtp.gmail.com 587`

### A password reset link goes nowhere, or points at localhost

Reset links are built from `WEB_BASE_URL` at the moment the email is sent, so a
wrong value here produces a link to the wrong host even though everything else
works. Fix `.env` and restart the API; previously sent links keep the old host
and must be re-requested.

Other checks, in order:

- The link is valid for **one hour** and works **once**. A second click, or a
  click after a newer link was requested, gives "no longer valid" — this is
  expected. Request a fresh one from **Forgot password**.
- `PASSWORD_RESET_TTL_MS` in `.env` controls the window (default `3600000`).
- Requesting a reset for an unregistered address still shows the "check your
  email" screen and sends nothing. This is deliberate — the response cannot be
  used to discover which addresses have accounts. Check the admin notification
  log to see whether a send actually happened.
- The forgot-password endpoint is rate-limited to 3 requests per minute per IP.
  Repeated attempts return 429.

### Excel export times out or fails

The full-roster export builds the workbook in memory. On a 1 GB server, with a large pool and other activity, it can be killed.

- Raise `proxy_read_timeout` on the `/api/` nginx location
- Check `journalctl -u fafics-api` for an out-of-memory kill
- If it recurs, this is the clearest signal to move to 2 GB

### Profiles are not expiring, or renewal reminders are not sent

The nightly job runs at 02:00 UTC inside the API process, and only if that process is running at the time.

```bash
journalctl -u fafics-api --since "yesterday" | grep -i -E "maintenance|expire|renewal"
```

Confirm the service stays up overnight (`systemctl status fafics-api` reports the uptime), and remember the schedule is UTC, not local time.

### The site is slow or unresponsive

```bash
free -h        # sustained swap use means memory pressure
df -h          # a full disk stops PostgreSQL writing
systemctl status fafics-api fafics-web postgresql
journalctl -u fafics-api -p err --since today
```

At this traffic level, genuine slowness almost always means memory pressure rather than load. Resizing to 2 GB is the fix.

---

## Appendix A — sub-path deployment

If the system must live under a path on an existing site — `https://fafics.org/experts` rather than its own hostname — both the sub-path and a matching API URL have to be compiled into the frontend.

Build with both variables set:

```bash
export NEXT_PUBLIC_BASE_PATH=/experts
export NEXT_PUBLIC_API_URL=https://fafics.org/experts/api
npm run build
```

Then copy `static` and `public` into the standalone output as usual, and configure nginx. The API location must come first, and the frontend `proxy_pass` must have **no trailing path**, so nginx forwards the `/experts` prefix intact:

```nginx
location /experts/api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}

location /experts/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Set `WEB_BASE_URL=https://fafics.org/experts` so emailed links carry the prefix, and restart the API.

Because the API is same-origin with the frontend in this arrangement, CORS does not come into play at all. The `Secure` cookie requirement still does — HTTPS remains mandatory.

Sub-path deployments fail in three predictable ways: pages 404 because `NEXT_PUBLIC_BASE_PATH` was not set at build time; assets 404 because `static`/`public` were not copied in; or everything 404s because nginx stripped the prefix before proxying to the Next.js server.

---

## Appendix B — alternative topologies

**Managed database, application on a VM.** Move PostgreSQL to RDS, DigitalOcean Managed PostgreSQL, or Neon, and point `DATABASE_URL` at it. The application server can then drop to 1 GB. Adds roughly $15–25 per month and removes backup and patching work. **This is the arrangement to prefer if no one on the team wants to be responsible for database administration.**

**Frontend on a platform, API on a VM.** Next.js deploys cleanly to Vercel. Note that the frontend and API then sit on different origins, which makes `WEB_BASE_URL` and the CORS configuration load-bearing, and requires both sides on HTTPS for the `SameSite=None` cookie to work. The single-server arrangement is simpler and, at this scale, cheaper.

**Everything on a platform.** The API can run on Render, Railway, or Fly.io from the same repository. The nightly maintenance job needs the process to be running at 02:00 UTC, so a scale-to-zero plan is not suitable without external triggering.

For 100–200 applications a year, the single-server arrangement in this guide is the least moving parts for the money. Reach for a managed database first if you want to reduce operational burden; leave the rest alone.

---

## Appendix C — environment variable reference

Set on the **server**, in `/opt/fafics/app/.env`:

| Variable | Required | Production value |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `API_PORT` | | `3001` |
| `DATABASE_URL` | **Yes** | `postgresql://fafics_user:<pw>@localhost:5432/fafics_db` |
| `JWT_SECRET` | **Yes** | 64 hex characters from `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | | `8h` — officer session length |
| `PRESIDENT_LINK_TTL_MS` | | `1209600000` — 14 days |
| `API_BASE_URL` | | `https://experts.fafics.org` |
| `WEB_BASE_URL` | Yes | `https://experts.fafics.org` — CORS origin and email link base |
| `FROM_EMAIL` | Yes | The authenticated Gmail account or a verified alias |
| `SECRETARY_EMAIL` | Yes | Mailbox for Secretariat notifications |
| `SMTP_HOST` | Yes | `smtp.gmail.com` |
| `SMTP_PORT` | Yes | `587` |
| `SMTP_USER` | Yes | Gmail account |
| `SMTP_PASS` | Yes | 16-character Gmail App Password |
| `RESEND_API_KEY` | | Leave **unset** to use SMTP |
| `ADMIN_EMAIL` | | Seed script only — first deployment |
| `ADMIN_PASSWORD` | | Seed script only — change after first sign-in |

Set on the **machine that builds the frontend**, before `npm run build`:

| Variable | Required | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://experts.fafics.org/api` |
| `NEXT_PUBLIC_BASE_PATH` | | Only for a sub-path deployment, e.g. `/experts` |

Both are compiled into the JavaScript bundle. Setting them on the server has no effect.
