# FAFICS Expertise Pool System

Secure web application for managing the FAFICS volunteer expert roster — replacing paper/Word forms and Excel spreadsheets with an automated, role-based workflow.

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Engine 26+ with Compose v2)
- [Node.js 20+](https://nodejs.org/) and npm 10+

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

### 3. Start infrastructure (Postgres, Redis, Mailhog)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`
- **Mailhog** SMTP on port `1025`, Web UI at [http://localhost:8025](http://localhost:8025)

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
- **Mailhog UI:** [http://localhost:8025](http://localhost:8025)

## Monorepo Structure

```
fafics-expertise-pool/
├── apps/
│   ├── api/              ← NestJS backend (port 3001)
│   └── web/              ← Next.js frontend (port 3000) — Phase 3
├── packages/
│   └── shared/           ← Shared TypeScript enums & types
├── docker-compose.yml    ← Local development infrastructure
├── turbo.json            ← Turborepo build orchestration
└── package.json          ← Root workspace config
```

## Architecture

See `FAFICS_Architecture.md` for the complete system architecture, data flow diagrams, API route table, and RBAC matrix.

## Tech Stack

See `FAFICS_Tech_Stack_Reference.md` for the exact libraries, versions, and decision rationale.
