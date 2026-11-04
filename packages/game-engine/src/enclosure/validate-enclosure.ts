import type { Board, EnclosedRegion, PlayerColor } from "../types.js";
import { classicOpponent } from "../rules/classic/index.js";
import { findEnclosedRegions } from "./find-enclosed-regions.js";

/**
 * Validate that a candidate region is a legal capture under §5.5–5.6.
 *
 * Returns true when the interior still contains at least one active opponent
 * point (creation-time requirement). Minimum geometric size (§5.6) is implied
 * by having a sealed contour around an opponent point.
 */
export function validateEnclosure(board: Board, region: EnclosedRegion): boolean {
  if (region.kind !== "capture") return false;
  if (region.interior.length === 0) return false;
  if (region.contour.indices.length < 4) return false;

  const opponent = classicOpponent(region.color);
  return region.interior.some((index) => {
    const cell = board.cells[index];
    return cell !== undefined && cell.color === opponent && !cell.disabled;
  });
}

/** Capture regions for `color` that pass validation. */
export function findValidCaptures(board: Board, color: PlayerColor): EnclosedRegion[] {
  return findEnclosedRegions(board, color).filter(
    (region) => region.kind === "capture" && validateEnclosure(board, region),
  );
}

/** Active домики for `color` (sealed empty interiors, §5.12–5.13). */
export function findHouses(board: Board, color: PlayerColor): EnclosedRegion[] {
  return findEnclosedRegions(board, color).filter((region) => region.kind === "house");
}
