import { describe, expect, it } from "vitest";
import {
  expectedScore,
  isLeaderboardVisible,
  kFactor,
  promoteTitle,
  recalculatePair,
  roundHalfUp,
  scoreFromWinner,
  titleForRating,
  winTradeFactor,
  RATING_FLOOR,
  RATING_START,
} from "./elo";

describe("roundHalfUp", () => {
  it("rounds halves away from zero", () => {
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(38.4)).toBe(38);
    expect(roundHalfUp(38.5)).toBe(39);
  });
});

describe("kFactor (band B)", () => {
  it("uses K=40 for the first 30 games", () => {
    expect(kFactor(1200, 0)).toBe(40);
    expect(kFactor(2500, 29)).toBe(40);
  });

  it("uses K=20 below 2400 after provisional", () => {
    expect(kFactor(2399, 30)).toBe(20);
    expect(kFactor(1500, 100)).toBe(20);
  });

  it("uses K=10 only while rating ≥2400 (not sticky)", () => {
    expect(kFactor(2400, 30)).toBe(10);
    expect(kFactor(2600, 50)).toBe(10);
    // Band B: drop below 2400 → K returns to 20
    expect(kFactor(2399, 50)).toBe(20);
  });
});

describe("titles", () => {
  it("maps rating thresholds", () => {
    expect(titleForRating(1299)).toBe("N");
    expect(titleForRating(1300)).toBe("3");
    expect(titleForRating(1500)).toBe("2");
    expect(titleForRating(1700)).toBe("1");
    expect(titleForRating(1900)).toBe("C");
    expect(titleForRating(2100)).toBe("M");
    expect(titleForRating(2300)).toBe("H");
    expect(titleForRating(2500)).toBe("G");
  });

  it("never demotes a permanent title", () => {
    expect(promoteTitle("M", 1200)).toBe("M");
    expect(promoteTitle("3", 2100)).toBe("M");
    expect(promoteTitle("N", 1299)).toBe("N");
  });
});

describe("winTradeFactor", () => {
  it("full for first three prior games, then diminishes", () => {
    expect(winTradeFactor(0)).toBe(1);
    expect(winTradeFactor(2)).toBe(1);
    expect(winTradeFactor(3)).toBe(0.5);
    expect(winTradeFactor(4)).toBe(0);
  });
});

describe("recalculatePair — plan examples", () => {
  it("1. Beginner beats Master — A 1200 (K=40) vs B 2150", () => {
    const ea = expectedScore(1200, 2150);
    // Plan approximates E_a ≈ 0.04; exact Elo is ~0.004
    expect(ea).toBeLessThan(0.05);
    expect(ea).toBeGreaterThan(0);

    const result = recalculatePair({
      ra: 1200,
      rb: 2150,
      sa: 1,
      gamesA: 0,
      gamesB: 40,
    });

    expect(result.ka).toBe(40);
    expect(result.kb).toBe(20);
    // Plan ≈ +38 / −19; exact half-up is +40 / −20
    expect(result.deltaA).toBe(40);
    expect(result.deltaB).toBe(-20);
    expect(result.ra2).toBe(1240);
    expect(result.rb2).toBe(2130);
  });

  it("2. Equal draw — 1500 vs 1500 → both 0", () => {
    const result = recalculatePair({
      ra: 1500,
      rb: 1500,
      sa: 0.5,
      gamesA: 40,
      gamesB: 40,
    });
    expect(result.ea).toBe(0.5);
    expect(result.deltaA).toBe(0);
    expect(result.deltaB).toBe(0);
    expect(result.ra2).toBe(1500);
    expect(result.rb2).toBe(1500);
  });

  it("3. Master loses to average — A 2150 (K=20) vs B 1500 (K=40 if new)", () => {
    const result = recalculatePair({
      ra: 2150,
      rb: 1500,
      sa: 0,
      gamesA: 40,
      gamesB: 0,
    });

    expect(result.ka).toBe(20);
    expect(result.kb).toBe(40);
    // Plan ≈ −19 / +38; exact half-up is −20 / +39
    expect(result.deltaA).toBe(-20);
    expect(result.deltaB).toBe(39);
    expect(result.ra2).toBe(2130);
    expect(result.rb2).toBe(1539);
  });

  it("respects rating floor 100", () => {
    const result = recalculatePair({
      ra: RATING_FLOOR,
      rb: 2000,
      sa: 0,
      gamesA: 40,
      gamesB: 40,
    });
    expect(result.ra2).toBe(RATING_FLOOR);
  });

  it("applies win-trade factor to both deltas", () => {
    const full = recalculatePair({
      ra: RATING_START,
      rb: RATING_START,
      sa: 1,
      gamesA: 0,
      gamesB: 0,
    });
    const half = recalculatePair({
      ra: RATING_START,
      rb: RATING_START,
      sa: 1,
      gamesA: 0,
      gamesB: 0,
      tradeFactor: 0.5,
    });
    expect(full.deltaA).toBe(20); // 40 * 0.5
    expect(half.deltaA).toBe(10);
    expect(half.deltaB).toBe(-10);
  });
});

describe("placement visibility", () => {
  it("hides until 5 ranked games", () => {
    const last = new Date();
    expect(
      isLeaderboardVisible({ gamesPlayed: 4, lastRankedAt: last }),
    ).toBe(false);
    expect(
      isLeaderboardVisible({ gamesPlayed: 5, lastRankedAt: last }),
    ).toBe(true);
  });

  it("hides after 365 days inactive", () => {
    const last = new Date("2020-01-01T00:00:00.000Z");
    const now = new Date("2021-01-02T00:00:00.000Z");
    expect(
      isLeaderboardVisible({ gamesPlayed: 10, lastRankedAt: last, now }),
    ).toBe(false);
  });
});

describe("scoreFromWinner", () => {
  it("maps win/draw/loss", () => {
    expect(scoreFromWinner("blue", "blue")).toBe(1);
    expect(scoreFromWinner("red", "blue")).toBe(0);
    expect(scoreFromWinner(null, "blue")).toBe(0.5);
  });
});
