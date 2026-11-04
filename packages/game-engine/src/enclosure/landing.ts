import { cloneBoard } from "../board/create-board.js";
import { classicOpponent } from "../rules/classic/index.js";
import type { Board, EnclosedRegion, PlayerColor } from "../types.js";
import { findExteriorMask } from "./find-enclosed-regions.js";
import { findValidCaptures } from "./validate-enclosure.js";
import { resolveCapture } from "./resolve-capture.js";
import { isActiveWall } from "./neighbors.js";

/**
 * §8.2 / §8.4 — surroundability under perfect opponent fill.
 *
 * Interpretation (documented for Yurii): a group of the declarer's material is
 * surroundable iff, when every empty playable intersection is filled with an
 * active opponent stone, that material lies in a valid opponent capture
 * interior under the existing 8-wall / 4-flood dual.
 *
 * Consequences matching СКСТ terminology + Priymak training:
 * - Orthogonal walls pressed to the border are unsurroundable (exterior).
 * - Diagonal-only attachment to the border stays surroundable (needs стенка).
 * - Passable diagonal скрест links (terminology §3.8 / §3.12) need no extra rule.
 *
 * Strategic landing (terminology §6.69) that is unsurroundable without a full
 * wall-to-border is NOT detected as grounded by this perfect-fill test — flagged
 * as a remaining ambiguity.
 */
export function findLandingCaptures(
  board: Board,
  declarer: PlayerColor,
): EnclosedRegion[] {
  const opponent = classicOpponent(declarer);
  const hyp = withEmptiesFilled(board, opponent);
  return findValidCaptures(hyp, opponent);
}

/**
 * Apply §8.4: surroundable declarer material is captured by the opponent on
 * the real board (empties inside those interiors are disabled too).
 */
export function resolveLandingCaptures(board: Board, declarer: PlayerColor): Board {
  const captures = findLandingCaptures(board, declarer);
  if (captures.length === 0) return board;
  return resolveCapture(board, captures);
}

/**
 * Active stones of `color` that remain in the exterior after perfect opponent
 * fill — i.e. grounded / unsurroundable under the §8.4 interpretation above.
 */
export function findGroundedIndices(board: Board, color: PlayerColor): number[] {
  const opponent = classicOpponent(color);
  const hyp = withEmptiesFilled(board, opponent);
  const exterior = findExteriorMask(hyp, opponent);
  const grounded: number[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    if (!isActiveWall(board, i, color)) continue;
    if (exterior[i]) grounded.push(i);
  }
  return grounded;
}

/** Active stones of `color` that §8.4 would award to the opponent. */
export function findSurroundableIndices(board: Board, color: PlayerColor): number[] {
  const grounded = new Set(findGroundedIndices(board, color));
  const surroundable: number[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    if (!isActiveWall(board, i, color)) continue;
    if (!grounded.has(i)) surroundable.push(i);
  }
  return surroundable;
}

function withEmptiesFilled(board: Board, filler: PlayerColor): Board {
  const next = cloneBoard(board);
  for (let i = 0; i < next.cells.length; i++) {
    const cell = next.cells[i]!;
    if (cell.color === null && !cell.disabled) {
      next.cells[i] = { color: filler, disabled: false, capturedBy: null };
    }
  }
  return next;
}
