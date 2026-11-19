import { describe, expect, it, vi } from "vitest";
import {
  RATING_POOL_CLASSICAL,
  RATING_START,
} from "./elo";
import {
  ensureClassicalRating,
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
