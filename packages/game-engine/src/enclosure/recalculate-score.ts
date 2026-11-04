import type { Board, PlayerColor } from "../types.js";

/**
 * Recalculate scores from board ownership (§6.1, §6.4).
 *
 * One point per opponent-colored cell disabled under an enclosure owned by
 * the scoring player. Nested capture is reflected by `capturedBy` updates in
 * `resolveCapture` — recomputing from scratch keeps §6.4 consistent.
 */
export function recalculateScore(board: Board): Record<PlayerColor, number> {
  const scores: Record<PlayerColor, number> = { blue: 0, red: 0 };

  for (const cell of board.cells) {
    if (!cell.disabled || cell.capturedBy === null || cell.color === null) continue;
    if (cell.color === cell.capturedBy) continue;
    scores[cell.capturedBy] += 1;
  }

  return scores;
}
