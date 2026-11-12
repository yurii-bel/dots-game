# Clerk setup (DOTS auth)

Configure a Clerk application, then put keys in `.env` (never commit secrets).

## SDK versions

- Web: `@clerk/nextjs` **v7** (Clerk Core 3) with Next.js App Router 15.5+
- Game server: `@clerk/backend` **v3** for Socket.IO session JWT verify

Keep these majors aligned so the Dashboard does not show the outdated SDK banner.

## Providers

Enable **only**:

- Email + password
- Google OAuth

Disable other social providers for this milestone.

## Keys

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys |
| `CLERK_SECRET_KEY` | Clerk → API keys (web + game server) |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → signing secret |
| `CLERK_JWT_KEY` (optional) | API keys → Show JWT public key (PEM) for networkless Socket.IO verify |
| `CLERK_AUTHORIZED_PARTIES` | Usually `http://localhost:3000` (and prod origin) |

See root `.env.example` for placeholders. `CLERK_ENCRYPTION_KEY` is only required if you pass `secretKey` into `clerkMiddleware()` (this app does not).

## Webhook

1. Endpoint: `https://<web-host>/api/webhooks/clerk` (local: Clerk CLI tunnel or similar).
2. Subscribe to `user.created` and `user.updated`.
3. `/api/me` also upserts by `clerkId` if the webhook has not run yet (idempotent).

## App flow

1. `/` — public landing (Sign in / Sign up).
2. After auth → `/api/me` upsert → if `nickname` is null → `/onboarding/nickname`.
3. Lobby / create / join / match / game require a signed-in user with a nickname.
4. Socket.IO handshake sends the Clerk session JWT only; the game server verifies it and loads Prisma `User`.

## Database (required for signed-in lobby)

Clerk sign-in alone is not enough: `/api/me` upserts a Prisma `User`. Without a live Postgres schema the route returns **503** with `code: "DATABASE_UNAVAILABLE"` and the lobby shows an **Account unavailable** screen (not a blank white page).

After setting `DATABASE_URL`:

```bash
docker compose up postgres -d   # if using the repo compose file
pnpm db:generate
pnpm db:push
```

Adds `User` (`clerkId`, nullable `nickname` / `nicknameNormalized`) and optional `GamePlayer.userId`. Re-run `pnpm db:push` whenever the Prisma schema changes or after a fresh Postgres volume.
