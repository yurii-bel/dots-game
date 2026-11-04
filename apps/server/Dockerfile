FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY packages/game-engine/package.json packages/game-engine/
COPY packages/database/package.json packages/database/
COPY apps/server/package.json apps/server/
RUN pnpm install --filter @dots/server... --frozen-lockfile || pnpm install --filter @dots/server...

FROM base AS runner
COPY --from=deps /app /app
COPY . .
WORKDIR /app/apps/server
EXPOSE 4000
CMD ["pnpm", "dev"]
