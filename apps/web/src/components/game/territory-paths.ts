import {
  buildCapturedTerritoryContours,
  type Board,
  type FormalPoint,
  type PlayerColor,
} from "@dots/game-engine";
import type { WireBoard } from "@dots/shared";

export type TerritoryPath = {
  color: PlayerColor;
  /**
   * Closed rings in formal coords (half-cell perimeter).
   * `rings[0]` is typically outer; further entries are holes (even-odd fill).
   */
  rings: FormalPoint[][];
  /** Interior cell count — used to size-sort nested regions (draw small on top). */
  interiorCount: number;
};

function asBoard(board: WireBoard): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells,
  };
}

/**
 * Build territory polygons from authoritative `capturedBy` cells via the engine
 * geometry API (half-cell perimeters, disconnected regions, holes).
 * Sorted ascending by interior size (P1 nesting — draw small on top).
 */
export function buildTerritoryPaths(board: WireBoard): TerritoryPath[] {
  if (board.cells.length === 0) return [];
  return buildCapturedTerritoryContours(asBoard(board)).map((contour) => ({
    color: contour.color,
    rings: contour.rings,
    interiorCount: contour.interiorCount,
  }));
}
