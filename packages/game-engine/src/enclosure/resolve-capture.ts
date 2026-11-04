import type { Board, EnclosedRegion, PlayerColor } from "../types.js";
import { cloneBoard } from "../board/create-board.js";

/**
 * Apply capture for one or more validated regions (§5.7).
 *
 * Interior empty points and all interior colored points are disabled and marked
 * `capturedBy` the enclosing color. Contour (chain) points stay active (§5.8).
 *
 * Nested / subsequent capture (§5.11, §6.4): previously disabled cells inside
 * the new interior are re-tagged to the new owner; scores are recomputed later.
 */
export function resolveCapture(board: Board, regions: readonly EnclosedRegion[]): Board {
  if (regions.length === 0) return board;

  const next = cloneBoard(board);

  for (const region of regions) {
    if (region.kind !== "capture") continue;
    applyRegionCapture(next, region.interior, region.color);
  }

  return next;
}

function applyRegionCapture(
  board: Board,
  interior: readonly number[],
  owner: PlayerColor,
): void {
  for (const index of interior) {
    const cell = board.cells[index];
    if (!cell) continue;
    board.cells[index] = {
      color: cell.color,
      disabled: true,
      capturedBy: owner,
    };
  }
}

/**
 * Whether `index` lies in the interior of any house of `houseColor` (§5.12).
 */
export function isIndexInHouse(
  houses: readonly EnclosedRegion[],
  index: number,
): boolean {
  return houses.some((house) => house.interior.includes(index));
}
