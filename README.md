# DOTS — Спортивные точки online

pnpm monorepo for an online browser-based Спортивные точки game.

> **Rules patch:** `@dots/game-engine` заземление (§8.2–8.4) + скрест dual docs; M4 multiplayer remains the playable 1v1 path.

## Package map

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@dots/web` | Next.js App Router — lobby + Canvas board + Zustand sync |
| `apps/server` | `@dots/server` | Authoritative Node.js Socket.IO game server |
| `packages/shared` | `@dots/shared` | Shared Zod schemas (socket contract + health) |
| `packages/game-engine` | `@dots/game-engine` | Pure TS engine — `initializeGame` / `applyMove` / `declareLanding` |
| `packages/database` | `@dots/database` | Prisma — `Game` / `GamePlayer` / `Move` (+ HealthCheck) |
| `packages/tsconfig` | `@dots/tsconfig` | Shared strict TypeScript base configs |

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 10.x (`corepack enable`)
- Docker (optional, for Postgres — **not required to play**)

## Local development (web + server)

Playable path needs **no Docker and no live Postgres**. Games stay in-memory on the Socket.IO server; Prisma persist is best-effort when `DATABASE_URL` is reachable.

```bash
# 1. Install (postinstall runs `pnpm db:generate` — no DB required)
pnpm install

# 2. Env (optional for play; copy if you want web/socket URLs explicit)
cp .env.example .env
# You can leave DATABASE_URL unset or pointed at a down Postgres — server still boots.

# 3. Run both apps
pnpm dev
# web    → http://localhost:3000
# server → http://localhost:4000/health
```

If the server ever dies on boot with `@prisma/client` / `GameStatus` export errors, regenerate the client and restart (no `db:push` needed):

```bash
pnpm db:generate
pnpm dev
```

### Optional Postgres (persist games / moves)

```bash
docker compose up postgres -d
# set DATABASE_URL in .env (see .env.example)
pnpm db:generate   # already done by postinstall; safe to re-run
pnpm db:push
```

### Windows notes

```text
# PowerShell / cmd from repo root
pnpm install
copy .env.example .env
pnpm db:generate
pnpm dev
```

- Do **not** need Docker Desktop for local 1v1 play.
- `pnpm db:generate` is enough for boot; `db:push` only if you want a real Postgres schema.
- If `:4000` connection refused: check the `apps/server` terminal for Prisma export errors, run `pnpm db:generate`, then restart `pnpm dev`.

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
| `pnpm db:generate` | Prisma client only (enough for server boot; no DB) |
| `pnpm db:push` | Push schema to a live Postgres (optional) |

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
