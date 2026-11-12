import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Lazy Prisma singleton.
 * Importing this module must not require DATABASE_URL, a live Postgres, or
 * even a fully generated client until the first property access.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { PrismaClient };

// Schema enums are type-only re-exports so a missing `prisma generate`
// cannot crash ESM loaders with "does not provide an export named …".
// Runtime string values ("waiting" | "blue" | …) are used at call sites.
export type {
  Game,
  GamePlayer,
  GameStatus,
  HealthCheck,
  Move,
  PlayerColor,
  Prisma,
  User,
} from "@prisma/client";
