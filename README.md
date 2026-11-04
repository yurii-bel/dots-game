# DOTS — Спортивные точки online

pnpm monorepo for an online browser-based Спортивные точки game.

> **Milestone 4:** playable online 1v1 — Socket.IO rooms, server-authoritative moves, Canvas board (points + territories), reconnect + `requestId` idempotency.

## Package map

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@dots/web` | Next.js App Router — lobby + Canvas board + Zustand sync |
| `apps/server` | `@dots/server` | Authoritative Node.js Socket.IO game server |
| `packages/shared` | `@dots/shared` | Shared Zod schemas (socket contract + health) |
| `packages/game-engine` | `@dots/game-engine` | Pure TS engine — classic `initializeGame` + `applyMove` |
| `packages/database` | `@dots/database` | Prisma — `Game` / `GamePlayer` / `Move` (+ HealthCheck) |
| `packages/tsconfig` | `@dots/tsconfig` | Shared strict TypeScript base configs |

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 10.x (`corepack enable`)
- Docker (optional, for Postgres)

## Local development (web + server)

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env

# 3. Postgres (optional — games run in-memory; Prisma persist is best-effort)
docker compose up postgres -d
export DATABASE_URL=postgresql://dots:dots@localhost:5432/dots?schema=public
pnpm db:generate
pnpm db:push

# 4. Run both apps
pnpm dev
# web    → http://localhost:3000
# server → http://localhost:4000/health
```

Open two browser profiles (or a normal + private window) on `http://localhost:3000`:

1. **Find match** on both, or
2. **Create private room** on one → share the room code → **Join** on the other.

Play on the Canvas board (mouse or touch). Scores / turn / resign live in the game chrome.

### Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Web + Socket.IO server in parallel |
| `pnpm test` | Vitest across the workspace |
| `pnpm typecheck` | `tsc --noEmit` for all packages |
| `pnpm db:generate` / `db:push` | Prisma client + schema push |

## Architecture (M4)

```
Browser A ──┐                    ┌── @dots/game-engine (initializeGame / applyMove)
Browser B ──┼── Socket.IO ── @dots/server ── in-memory rooms
            │                    └── Prisma (optional Game/Move persist)
            └── Zustand holds sync / pending UI only (not rules)
```

**Socket contract** (see `@dots/shared` `SocketEvents`):

- Client → server: `matchmaking:join/cancel`, `game:create/join/move/resign/sync`
- Server → client: `matchmaking:found`, `game:started`, `game:move:accepted|rejected`, `game:state`, opponent presence, `game:finished`
- Moves carry `expectedVersion` + `requestId` (idempotent replay)

**Canvas board** (`components/game/`): single HTML Canvas — white grid, blue/red dots, translucent captured territories; responsive ResizeObserver; mouse + touch place.

## Out of scope (deferred)

Заземление, скрест formal modeling, four-cross rematch, auth/rating polish.

## Stack

Next.js App Router · TypeScript · Tailwind CSS · HTML Canvas · Node.js · Socket.IO · PostgreSQL · Prisma · Zustand · Zod · Vitest · Playwright
