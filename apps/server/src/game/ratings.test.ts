import { describe, expect, it, vi } from "vitest";
import { applyRankedGameResult } from "./ratings.js";

function ratingRow(userId: string, rating: number, gamesPlayed: number, title = "N") {
  return {
    id: `rating_${userId}`,
    userId,
    pool: "classical",
    rating,
    gamesPlayed,
    title,
    lastRankedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("applyRankedGameResult", () => {
  it("skips unranked (private) games", async () => {
    const outcome = await applyRankedGameResult({} as never, {
      gameId: "g1",
      ranked: false,
      winner: "blue",
      blueUserId: "u_a",
      redUserId: "u_b",
    });
    expect(outcome).toEqual({ kind: "skipped", reason: "unranked" });
  });

  it("skips when db is null", async () => {
    const outcome = await applyRankedGameResult(null, {
      gameId: "g1",
      ranked: true,
      winner: "blue",
      blueUserId: "u_a",
      redUserId: "u_b",
    });
    expect(outcome).toEqual({ kind: "skipped", reason: "no_db" });
  });

  it("applies Classical deltas for a ranked matchmaking finish", async () => {
    const updates: unknown[] = [];
    const creates: unknown[] = [];

    const prisma = {
      rankedResult: {
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(async ({ data }: { data: unknown }) => {
          creates.push(data);
          return data;
        }),
      },
      rating: {
        findUnique: vi.fn(async ({ where }: { where: { userId_pool: { userId: string } } }) => {
          const id = where.userId_pool.userId;
          if (id === "u_blue") return ratingRow("u_blue", 1200, 0);
          if (id === "u_red") return ratingRow("u_red", 2150, 40, "M");
          return null;
        }),
        create: vi.fn(),
        update: vi.fn(async ({ where, data }: { where: unknown; data: unknown }) => {
          updates.push({ where, data });
          return data;
        }),
      },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const outcome = await applyRankedGameResult(prisma as never, {
      gameId: "g_ranked_1",
      ranked: true,
      winner: "blue",
      blueUserId: "u_blue",
      redUserId: "u_red",
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    expect(outcome.blue.before).toBe(1200);
    expect(outcome.blue.after).toBe(1240);
    expect(outcome.red.before).toBe(2150);
    expect(outcome.red.after).toBe(2130);
    expect(outcome.tradeFactor).toBe(1);
    expect(creates).toHaveLength(1);
    expect(updates).toHaveLength(2);
  });

  it("is idempotent when RankedResult already exists", async () => {
    const prisma = {
      rankedResult: {
        findUnique: vi.fn().mockResolvedValue({ id: "rr1", gameId: "g1" }),
      },
    };
    const outcome = await applyRankedGameResult(prisma as never, {
      gameId: "g1",
      ranked: true,
      winner: "blue",
      blueUserId: "u_a",
      redUserId: "u_b",
    });
    expect(outcome).toEqual({ kind: "skipped", reason: "already_applied" });
  });
});
