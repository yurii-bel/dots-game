# Clerk setup (DOTS auth)

Configure a Clerk application, then put keys in `.env` (never commit secrets).

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

See root `.env.example` for placeholders.

## Webhook

1. Endpoint: `https://<web-host>/api/webhooks/clerk` (local: Clerk CLI tunnel or similar).
2. Subscribe to `user.created` and `user.updated`.
3. `/api/me` also upserts by `clerkId` if the webhook has not run yet (idempotent).

## App flow

1. `/` — public landing (Sign in / Sign up).
2. After auth → `/api/me` upsert → if `nickname` is null → `/onboarding/nickname`.
3. Lobby / create / join / match / game require a signed-in user with a nickname.
4. Socket.IO handshake sends the Clerk session JWT only; the game server verifies it and loads Prisma `User`.

## Database

After setting `DATABASE_URL`:

```bash
pnpm db:generate
pnpm db:push
```

Adds `User` (`clerkId`, nullable `nickname` / `nicknameNormalized`) and optional `GamePlayer.userId`.
