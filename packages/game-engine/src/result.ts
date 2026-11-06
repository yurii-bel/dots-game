import type { PlayerColor } from "./types";

/**
 * §8.6 — winner by final score when the outcome is score-determined
 * (`board_full`, `landing`). Equal scores → draw (`null`).
 */
export function winnerFromScores(
  scores: Readonly<Record<PlayerColor, number>>,
): PlayerColor | null {
  if (scores.blue === scores.red) return null;
  return scores.blue > scores.red ? "blue" : "red";
}
