/**
 * Classical Elo helpers for DOTS ranking (pool: classical only in v1).
 *
 * Locked rules (lobby-ui-and-ranking-plan):
 * - R_start 1200, floor 100
 * - K=40 first 30 ranked games; else K=20 if R<2400; K=10 only while R≥2400 (band B)
 * - Half-up round (half away from zero); permanent Classical titles
 * - Placement: 5 ranked games before public leaderboard visibility
 * - Win-trade: diminish after 3 ranked games vs same opponent in 24h
 */

export const RATING_POOL_CLASSICAL = "classical" as const;
export type RatingPool = typeof RATING_POOL_CLASSICAL;

export const RATING_START = 1200;
export const RATING_FLOOR = 100;
export const PROVISIONAL_GAMES = 30;
export const HIGH_RATING_BAND = 2400;
export const PLACEMENT_GAMES = 5;
export const LEADERBOARD_INACTIVE_MS = 365 * 24 * 60 * 60 * 1000;
export const WIN_TRADE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Permanent Classical titles (highest threshold earned is kept). */
export const CLASSICAL_TITLES = ["N", "3", "2", "1", "C", "M", "H", "G"] as const;
export type ClassicalTitle = (typeof CLASSICAL_TITLES)[number];

/** Minimum rating to earn each title (N is the default / floor title). */
export const CLASSICAL_TITLE_THRESHOLDS: ReadonlyArray<{
  title: ClassicalTitle;
  minRating: number;
}> = [
  { title: "G", minRating: 2500 },
  { title: "H", minRating: 2300 },
  { title: "M", minRating: 2100 },
  { title: "C", minRating: 1900 },
  { title: "1", minRating: 1700 },
  { title: "2", minRating: 1500 },
  { title: "3", minRating: 1300 },
  { title: "N", minRating: 0 },
];

export type Score = 0 | 0.5 | 1;

/** Half-up = half away from zero (Java BigDecimal HALF_UP). */
export function roundHalfUp(n: number): number {
  if (!Number.isFinite(n)) return n;
  return n >= 0 ? Math.floor(n + 0.5) : -Math.floor(Math.abs(n) + 0.5);
}

/** Expected score for player A vs B. */
export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/**
 * Band-B K-factor: provisional 40 for first 30 games; else 20 below 2400;
 * 10 only while currently ≥2400 (falls back to 20 if rating drops).
 */
export function kFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < PROVISIONAL_GAMES) return 40;
  if (rating < HIGH_RATING_BAND) return 20;
  return 10;
}

/** Title earned by current rating alone (ignores permanence). */
export function titleForRating(rating: number): ClassicalTitle {
  for (const row of CLASSICAL_TITLE_THRESHOLDS) {
    if (rating >= row.minRating) return row.title;
  }
  return "N";
}

function titleRank(title: ClassicalTitle): number {
  const idx = CLASSICAL_TITLES.indexOf(title);
  return idx < 0 ? 0 : idx;
}

/** Permanent promotion: never demote when rating falls. */
export function promoteTitle(
  current: ClassicalTitle,
  ratingAfter: number,
): ClassicalTitle {
  const earned = titleForRating(ratingAfter);
  return titleRank(earned) > titleRank(current) ? earned : current;
}

/**
 * Win-trade diminishing returns.
 * Prior ranked games vs the same opponent in the rolling 24h window
 * (excluding the game about to be applied):
 * - 0–2 prior → full (1)
 * - 3 prior (4th game) → 0.5
 * - 4+ prior → 0
 */
export function winTradeFactor(priorRankedVsOpponentIn24h: number): number {
  if (priorRankedVsOpponentIn24h < 3) return 1;
  if (priorRankedVsOpponentIn24h === 3) return 0.5;
  return 0;
}

export function clampRating(rating: number): number {
  return Math.max(RATING_FLOOR, rating);
}

export type RecalculatePairInput = {
  ra: number;
  rb: number;
  /** A's score: 1 win, 0.5 draw, 0 loss. B gets 1 - sa. */
  sa: Score;
  gamesA: number;
  gamesB: number;
  /** Multiplier for both deltas (win-trade). Default 1. */
  tradeFactor?: number;
};

export type RecalculatePairResult = {
  ra2: number;
  rb2: number;
  ka: number;
  kb: number;
  ea: number;
  eb: number;
  deltaA: number;
  deltaB: number;
};

export function recalculatePair(input: RecalculatePairInput): RecalculatePairResult {
  const factor = input.tradeFactor ?? 1;
  const ka = kFactor(input.ra, input.gamesA);
  const kb = kFactor(input.rb, input.gamesB);
  const ea = expectedScore(input.ra, input.rb);
  const eb = 1 - ea;
  const sb = (1 - input.sa) as Score;

  const deltaA = roundHalfUp(ka * factor * (input.sa - ea));
  const deltaB = roundHalfUp(kb * factor * (sb - eb));

  return {
    ra2: clampRating(input.ra + deltaA),
    rb2: clampRating(input.rb + deltaB),
    ka,
    kb,
    ea,
    eb,
    deltaA,
    deltaB,
  };
}

/** Public Classical leaderboard visibility (placement + inactivity). */
export function isLeaderboardVisible(input: {
  gamesPlayed: number;
  lastRankedAt: Date | null;
  now?: Date;
}): boolean {
  if (input.gamesPlayed < PLACEMENT_GAMES) return false;
  if (!input.lastRankedAt) return false;
  const now = input.now ?? new Date();
  return now.getTime() - input.lastRankedAt.getTime() <= LEADERBOARD_INACTIVE_MS;
}

export function scoreFromWinner(
  winnerColor: "blue" | "red" | null,
  playerColor: "blue" | "red",
): Score {
  if (winnerColor == null) return 0.5;
  return winnerColor === playerColor ? 1 : 0;
}
