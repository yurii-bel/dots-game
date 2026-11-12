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
| `packages/database` | `@dots/database` | Prisma — `User` (Clerk) / `Game` / `GamePlayer` / `Move` (+ HealthCheck) |
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

# 2. Env — copy and fill Clerk keys (see docs/clerk-setup.md)
cp .env.example .env
# DATABASE_URL optional for anonymous in-memory play; **required for Clerk lobby / nicknames**.
# CLERK_* required for web auth + Socket.IO JWT verify.

# 3. For signed-in play: start Postgres and push the User schema
docker compose up postgres -d
pnpm db:push

# 4. Run both apps
pnpm dev
# web    → http://localhost:3000 (public landing; lobby at /lobby)
# server → http://localhost:4000/health
```

If `/api/me` returns 503 / lobby shows **Account unavailable** after sign-in, Postgres is down or the schema was never pushed — run `pnpm db:push` (see `docs/clerk-setup.md`).

If the server ever dies on boot with `@prisma/client` / `GameStatus` export errors, regenerate the client and restart (no `db:push` needed):

```bash
pnpm db:generate
pnpm dev
```

### Optional Postgres (persist games / moves + auth users)

```bash
docker compose up postgres -d
# set DATABASE_URL in .env (see .env.example)
pnpm db:generate   # already done by postinstall; safe to re-run
pnpm db:push       # required for Clerk /api/me User upsert + nicknames
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
- `pnpm db:generate` is enough for server boot; run `pnpm db:push` before Clerk sign-in / lobby (User table).
- If `:4000` connection refused: check the `apps/server` terminal for Prisma export errors, run `pnpm db:generate`, then restart `pnpm dev`.

#### Windows / `next/font` note

If `@dots/web` fails compiling `/` with `ERR_REQUIRE_ESM` from `magic-string` (via `@tailwindcss/postcss` → `@tailwindcss/node`), pull latest, then do a clean reinstall and restart:

```bash
# from repo root (PowerShell or cmd)
rmdir /s /q node_modules
pnpm install
pnpm dev
```

Root `pnpm.overrides` pins `magic-string` to `0.30.21` (dual CJS/ESM). Tailwind v4.3.4 otherwise pulls ESM-only `magic-string@1.x`, which breaks Next’s CJS PostCSS/`next/font` loader on some Node/Windows setups. The Socket.IO server on `:4000` can still start while Next fails — that is expected for this bug.

With Clerk keys set: sign in on two browser profiles → choose nicknames → open `/lobby`:

1. **Find match** on both, or
2. **Create private room** on one → share the room code → **Join** on the other.

Play on the Canvas board (mouse or touch). Scoreboard shows color dot · nickname · score.

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

**Auth:** Clerk (email+password + Google). Landing `/` is public; `/lobby`, `/game/*`, onboarding require auth + nickname. Socket.IO handshake sends a Clerk JWT only; the server maps Prisma `userId` ↔ seat `playerId`.

**Socket contract** (see `@dots/shared` `SocketEvents`):

- Client → server: `matchmaking:join/cancel`, `game:create/join/move/resign/sync` (no client identity claims)
- Server → client: `matchmaking:found`, `game:started`, `game:move:accepted|rejected`, `game:state`, opponent presence, `game:finished`
- Moves carry `expectedVersion` + `requestId` (idempotent replay); seat identity comes from the verified socket session

**Canvas board** (`components/game/`): single HTML Canvas — white grid, blue/red dots, translucent captured territories; responsive ResizeObserver; mouse + touch place.

## Out of scope (deferred)

Заземление, скрест formal modeling, four-cross rematch, auth/rating polish.

## Stack

Next.js App Router · TypeScript · Tailwind CSS · HTML Canvas · Node.js · Socket.IO · PostgreSQL · Prisma · Zustand · Zod · Vitest · Playwright
