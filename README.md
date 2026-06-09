# FAFICS Expertise Pool System

Secure web application for managing the FAFICS volunteer expert roster — replacing paper/Word forms and Excel spreadsheets with an automated, role-based workflow.

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/) and npm 10+
- A [PostgreSQL 16+](https://www.postgresql.org/) database (local install or a managed/remote instance)

### 1. Clone & configure

```bash
git clone <repo-url> fafics-expertise-pool
cd fafics-expertise-pool
cp .env.example .env
```

### 2. Install dependencies

```bash
npm install
```

### 3. Provide a PostgreSQL database

Make sure a PostgreSQL 16+ instance is running and reachable, then set `DATABASE_URL`
in your `.env` to point at it (the default in `.env.example` assumes Postgres on
`localhost:5432`).

Email in local dev is sent via the SMTP settings in `.env` (Gmail by default). To
inspect mail locally instead of sending real email, run a standalone
[Mailhog](https://github.com/mailhog/MailHog) and set `SMTP_HOST=localhost` /
`SMTP_PORT=1025`.

### 4. Run database migration

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

### 5. Start the API (development)

```bash
cd apps/api
npm run start:dev
```

The API starts at [http://localhost:3001](http://localhost:3001).

- **Health check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Swagger docs:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## Monorepo Structure

```
fafics-expertise-pool/
├── apps/
│   ├── api/              ← NestJS backend (port 3001)
│   └── web/              ← Next.js frontend (port 3000) — Phase 3
├── packages/
│   └── shared/           ← Shared TypeScript enums & types
├── turbo.json            ← Turborepo build orchestration
└── package.json          ← Root workspace config
```

## Architecture

See `FAFICS_Architecture.md` for the complete system architecture, data flow diagrams, API route table, and RBAC matrix.

## Tech Stack

See `FAFICS_Tech_Stack_Reference.md` for the exact libraries, versions, and decision rationale.
