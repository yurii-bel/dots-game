/**
 * Classical rating row helpers (Prisma-agnostic client interface).
 */

import {
  LEADERBOARD_INACTIVE_MS,
  PLACEMENT_GAMES,
  RATING_POOL_CLASSICAL,
  RATING_START,
  isLeaderboardVisible,
  type ClassicalTitle,
} from "./elo";
import type { ClassicalRating, LeaderboardEntry } from "./nickname";

export type RatingRecord = {
  id: string;
  userId: string;
  pool: string;
  rating: number;
  gamesPlayed: number;
  title: string;
  lastRankedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RatingClient = {
  rating: {
    findUnique: (args: {
      where: { userId_pool: { userId: string; pool: string } };
    }) => Promise<RatingRecord | null>;
    create: (args: {
      data: {
        userId: string;
        pool: string;
        rating?: number;
        gamesPlayed?: number;
        title?: string;
      };
    }) => Promise<RatingRecord>;
  };
};

export type LeaderboardRow = {
  rating: number;
  title: string;
  gamesPlayed: number;
  user: { nickname: string | null };
};

export type LeaderboardClient = {
  rating: {
    findMany: (args: {
      where: {
        pool: string;
        gamesPlayed: { gte: number };
        lastRankedAt: { gte: Date };
        user: { nickname: { not: null } };
      };
      orderBy: Array<{ rating: "desc" } | { updatedAt: "asc" }>;
      take: number;
      select: {
        rating: true;
        title: true;
        gamesPlayed: true;
        user: { select: { nickname: true } };
      };
    }) => Promise<LeaderboardRow[]>;
  };
};

export const DEFAULT_LEADERBOARD_LIMIT = 100;

/** Ensure a Classical rating row exists (lazy create at R_start / title N). */
export async function ensureClassicalRating(
  db: RatingClient,
  userId: string,
): Promise<RatingRecord> {
  const existing = await db.rating.findUnique({
    where: { userId_pool: { userId, pool: RATING_POOL_CLASSICAL } },
  });
  if (existing) return existing;
  try {
    return await db.rating.create({
      data: {
        userId,
        pool: RATING_POOL_CLASSICAL,
        rating: RATING_START,
        gamesPlayed: 0,
        title: "N",
      },
    });
  } catch {
    // Concurrent create race — re-read.
    const again = await db.rating.findUnique({
      where: { userId_pool: { userId, pool: RATING_POOL_CLASSICAL } },
    });
    if (again) return again;
    throw new Error("Failed to ensure Classical rating");
  }
}

export function toClassicalRatingSnapshot(
  row: RatingRecord,
  now = new Date(),
): ClassicalRating {
  return {
    rating: row.rating,
    title: row.title as ClassicalTitle,
    gamesPlayed: row.gamesPlayed,
    leaderboardVisible: isLeaderboardVisible({
      gamesPlayed: row.gamesPlayed,
      lastRankedAt: row.lastRankedAt,
      now,
    }),
  };
}

/**
 * Public Classical leaderboard: ≥5 ranked games, active within 365 days,
 * nickname set. Ordered by rating desc.
 */
export async function listClassicalLeaderboard(
  db: LeaderboardClient,
  options?: { limit?: number; now?: Date },
): Promise<LeaderboardEntry[]> {
  const limit = Math.min(
    Math.max(options?.limit ?? DEFAULT_LEADERBOARD_LIMIT, 1),
    200,
  );
  const now = options?.now ?? new Date();
  const since = new Date(now.getTime() - LEADERBOARD_INACTIVE_MS);

  const rows = await db.rating.findMany({
    where: {
      pool: RATING_POOL_CLASSICAL,
      gamesPlayed: { gte: PLACEMENT_GAMES },
      lastRankedAt: { gte: since },
      user: { nickname: { not: null } },
    },
    orderBy: [{ rating: "desc" }, { updatedAt: "asc" }],
    take: limit,
    select: {
      rating: true,
      title: true,
      gamesPlayed: true,
      user: { select: { nickname: true } },
    },
  });

  const entries: LeaderboardEntry[] = [];
  for (const row of rows) {
    const nickname = row.user.nickname?.trim();
    if (!nickname) continue;
    entries.push({
      rank: entries.length + 1,
      nickname,
      title: row.title as ClassicalTitle,
      rating: row.rating,
      gamesPlayed: row.gamesPlayed,
    });
  }
  return entries;
}
