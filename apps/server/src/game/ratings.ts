/**
 * Apply Classical Elo after a ranked Find-match finishes.
 * Private rooms are unranked in v1 (caller must pass ranked=true).
 */

import type { PlayerColor, PrismaClient } from "@dots/database";
import {
  RATING_POOL_CLASSICAL,
  WIN_TRADE_WINDOW_MS,
  ensureClassicalRating,
  promoteTitle,
  recalculatePair,
  scoreFromWinner,
  winTradeFactor,
  type ClassicalTitle,
  type Score,
} from "@dots/shared";

export type ApplyRankedResultInput = {
  gameId: string;
  ranked: boolean;
  winner: PlayerColor | null;
  blueUserId: string;
  redUserId: string;
};

export type ApplyRankedResultOutcome =
  | { kind: "skipped"; reason: "unranked" | "missing_users" | "already_applied" | "no_db" }
  | {
      kind: "applied";
      tradeFactor: number;
      blue: { before: number; after: number; delta: number; title: ClassicalTitle };
      red: { before: number; after: number; delta: number; title: ClassicalTitle };
    };

function pairIds(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

async function countPriorRankedInWindow(
  prisma: PrismaClient,
  userLowId: string,
  userHighId: string,
  now: Date,
): Promise<number> {
  const since = new Date(now.getTime() - WIN_TRADE_WINDOW_MS);
  return prisma.rankedResult.count({
    where: {
      pool: RATING_POOL_CLASSICAL,
      userLowId,
      userHighId,
      createdAt: { gte: since },
    },
  });
}

/**
 * Idempotent: skips if a RankedResult already exists for gameId.
 * Safe to call for private rooms (returns skipped/unranked).
 */
export async function applyRankedGameResult(
  prisma: PrismaClient | null,
  input: ApplyRankedResultInput,
  now = new Date(),
): Promise<ApplyRankedResultOutcome> {
  if (!prisma) return { kind: "skipped", reason: "no_db" };
  if (!input.ranked) return { kind: "skipped", reason: "unranked" };
  if (!input.blueUserId || !input.redUserId) {
    return { kind: "skipped", reason: "missing_users" };
  }
  if (input.blueUserId === input.redUserId) {
    return { kind: "skipped", reason: "missing_users" };
  }

  const existing = await prisma.rankedResult.findUnique({
    where: { gameId: input.gameId },
  });
  if (existing) return { kind: "skipped", reason: "already_applied" };

  const { low, high } = pairIds(input.blueUserId, input.redUserId);
  const blueIsLow = input.blueUserId === low;

  const [ratingBlue, ratingRed] = await Promise.all([
    ensureClassicalRating(prisma, input.blueUserId),
    ensureClassicalRating(prisma, input.redUserId),
  ]);

  const prior = await countPriorRankedInWindow(prisma, low, high, now);
  const trade = winTradeFactor(prior);

  const scoreBlue = scoreFromWinner(input.winner, "blue");
  const pair = recalculatePair({
    ra: ratingBlue.rating,
    rb: ratingRed.rating,
    sa: scoreBlue as Score,
    gamesA: ratingBlue.gamesPlayed,
    gamesB: ratingRed.gamesPlayed,
    tradeFactor: trade,
  });

  const titleBlue = promoteTitle(
    ratingBlue.title as ClassicalTitle,
    pair.ra2,
  );
  const titleRed = promoteTitle(
    ratingRed.title as ClassicalTitle,
    pair.rb2,
  );

  const scoreLow = (blueIsLow ? scoreBlue : ((1 - scoreBlue) as Score)) as number;
  const beforeLow = blueIsLow ? ratingBlue.rating : ratingRed.rating;
  const afterLow = blueIsLow ? pair.ra2 : pair.rb2;
  const beforeHigh = blueIsLow ? ratingRed.rating : ratingBlue.rating;
  const afterHigh = blueIsLow ? pair.rb2 : pair.ra2;

  try {
    await prisma.$transaction([
      prisma.rating.update({
        where: { userId_pool: { userId: input.blueUserId, pool: RATING_POOL_CLASSICAL } },
        data: {
          rating: pair.ra2,
          gamesPlayed: { increment: 1 },
          title: titleBlue,
          lastRankedAt: now,
        },
      }),
      prisma.rating.update({
        where: { userId_pool: { userId: input.redUserId, pool: RATING_POOL_CLASSICAL } },
        data: {
          rating: pair.rb2,
          gamesPlayed: { increment: 1 },
          title: titleRed,
          lastRankedAt: now,
        },
      }),
      prisma.rankedResult.create({
        data: {
          gameId: input.gameId,
          pool: RATING_POOL_CLASSICAL,
          userLowId: low,
          userHighId: high,
          winnerColor: input.winner,
          ratingBeforeLow: beforeLow,
          ratingAfterLow: afterLow,
          ratingBeforeHigh: beforeHigh,
          ratingAfterHigh: afterHigh,
          scoreLow,
          tradeFactor: trade,
          createdAt: now,
        },
      }),
    ]);
  } catch (err) {
    // Unique gameId race — treat as already applied.
    const again = await prisma.rankedResult.findUnique({
      where: { gameId: input.gameId },
    });
    if (again) return { kind: "skipped", reason: "already_applied" };
    throw err;
  }

  return {
    kind: "applied",
    tradeFactor: trade,
    blue: {
      before: ratingBlue.rating,
      after: pair.ra2,
      delta: pair.deltaA,
      title: titleBlue,
    },
    red: {
      before: ratingRed.rating,
      after: pair.rb2,
      delta: pair.deltaB,
      title: titleRed,
    },
  };
}
