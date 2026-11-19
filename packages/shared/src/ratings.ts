/**
 * Classical rating row helpers (Prisma-agnostic client interface).
 */

import {
  RATING_POOL_CLASSICAL,
  RATING_START,
  isLeaderboardVisible,
  type ClassicalTitle,
} from "./elo";
import type { ClassicalRating } from "./nickname";

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
