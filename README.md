# DOTS — Спортивные точки online

pnpm monorepo scaffold for an online browser-based Спортивные точки game.

> **Milestone 3:** `@dots/game-engine` classic `applyMove` — turn/bounds/occupancy validation, enclosure/capture, домик (§5.12–5.16).

## Package map

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@dots/web` | Next.js App Router frontend (Tailwind + shadcn/ui ready, Zustand) |
| `apps/server` | `@dots/server` | Dedicated Node.js Socket.IO server (scaffold / health only) |
| `packages/shared` | `@dots/shared` | Shared Zod schemas, constants, types |
| `packages/game-engine` | `@dots/game-engine` | Pure TS engine — classic `initializeGame` + `applyMove` (СКСТ 2017.1) |
| `packages/database` | `@dots/database` | Prisma + PostgreSQL client wiring |
| `packages/tsconfig` | `@dots/tsconfig` | Shared strict TypeScript base configs |

Project rules live in [`.cursor/rules/project.mdc`](.cursor/rules/project.mdc).

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 10.x (`corepack enable`)
- Docker (optional, for Postgres + app containers)

## Local development

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env

# 3. Postgres (Docker) — recommended
docker compose up postgres -d

# 4. Prisma client + schema push (placeholder HealthCheck table)
export DATABASE_URL=postgresql://dots:dots@localhost:5432/dots?schema=public
pnpm db:generate
pnpm db:push

# 5. Run apps
pnpm dev
# web   → http://localhost:3000
# server → http://localhost:4000/health
```

### Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Web + Socket.IO server in parallel |
| `pnpm build` | Build all packages/apps that define `build` |
| `pnpm test` | Vitest unit tests across the workspace |
| `pnpm test:e2e` | Playwright smoke (web) |
| `pnpm db:generate` / `db:push` / `db:migrate` | Prisma |

## Docker (full stack)

```bash
cp .env.example .env
docker compose up --build
```

Services: `postgres` (:5432), `server` (:4000), `web` (:3000).

## Architecture notes

- **Server-authoritative:** gameplay will live on `@dots/server` + `@dots/game-engine`; the Next app is a client.
- **Game engine** is a separate package so rules stay testable without HTTP/UI.
- **Prisma schema** currently has only a `HealthCheck` placeholder — no game tables yet.

## Stack

Next.js App Router · TypeScript (strict) · Tailwind CSS · shadcn/ui · Node.js · Socket.IO · PostgreSQL · Prisma · Zustand · Zod · Vitest · Playwright
