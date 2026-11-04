import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/** Shared Prisma client singleton (safe for Next.js hot reload). */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type {
  Game,
  GamePlayer,
  HealthCheck,
  Move,
  Prisma,
} from "@prisma/client";
export { GameStatus, PlayerColor } from "@prisma/client";
