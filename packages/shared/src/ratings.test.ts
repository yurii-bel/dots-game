import { describe, expect, it, vi } from "vitest";
import {
  PLACEMENT_GAMES,
  RATING_POOL_CLASSICAL,
  RATING_START,
} from "./elo";
import {
  ensureClassicalRating,
  listClassicalLeaderboard,
  toClassicalRatingSnapshot,
  type RatingRecord,
} from "./ratings";

function fakeRating(
  partial: Partial<RatingRecord> & Pick<RatingRecord, "id" | "userId">,
): RatingRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    pool: RATING_POOL_CLASSICAL,
    rating: RATING_START,
    gamesPlayed: 0,
    title: "N",
    lastRankedAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("ensureClassicalRating", () => {
  it("returns existing Classical row", async () => {
    const existing = fakeRating({ id: "r1", userId: "u1", rating: 1400, title: "3" });
    const db = {
      rating: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    };
    const row = await ensureClassicalRating(db, "u1");
    expect(row.rating).toBe(1400);
    expect(db.rating.create).not.toHaveBeenCalled();
  });

  it("creates at 1200 / N when missing", async () => {
    const created = fakeRating({ id: "r2", userId: "u2" });
    const db = {
      rating: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const row = await ensureClassicalRating(db, "u2");
    expect(row.rating).toBe(RATING_START);
    expect(db.rating.create).toHaveBeenCalledWith({
      data: {
        userId: "u2",
        pool: RATING_POOL_CLASSICAL,
        rating: RATING_START,
        gamesPlayed: 0,
        title: "N",
      },
    });
  });
});

describe("toClassicalRatingSnapshot", () => {
  it("stubs leaderboardVisible until 5 games", () => {
    const snap = toClassicalRatingSnapshot(
      fakeRating({
        id: "r3",
        userId: "u3",
        gamesPlayed: 4,
        lastRankedAt: new Date(),
      }),
    );
    expect(snap.leaderboardVisible).toBe(false);
    expect(snap.rating).toBe(1200);
    expect(snap.title).toBe("N");
  });
});

describe("listClassicalLeaderboard", () => {
  it("queries Classical placement + activity window and ranks rows", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      { rating: 2100, title: "M", gamesPlayed: 40, user: { nickname: "Ace" } },
      { rating: 1500, title: "2", gamesPlayed: 12, user: { nickname: "Bee" } },
      { rating: 1400, title: "3", gamesPlayed: 8, user: { nickname: "  " } },
    ]);
    const entries = await listClassicalLeaderboard(
      { rating: { findMany } },
      { limit: 50, now },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pool: RATING_POOL_CLASSICAL,
          gamesPlayed: { gte: PLACEMENT_GAMES },
        }),
        take: 50,
      }),
    );
    expect(entries).toEqual([
      { rank: 1, nickname: "Ace", title: "M", rating: 2100, gamesPlayed: 40 },
      { rank: 2, nickname: "Bee", title: "2", rating: 1500, gamesPlayed: 12 },
    ]);
  });
});
