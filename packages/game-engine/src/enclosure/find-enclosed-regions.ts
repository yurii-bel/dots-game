import type { Board, ClosedContour, EnclosedRegion, PlayerColor } from "../types";
import { findConnectedComponents } from "./find-connected-components";
import { isActiveWall, neighborIndices4, neighborIndices8 } from "./neighbors";
import { classicOpponent } from "../rules/classic/index";

/**
 * Mark every non-wall cell reachable from the board edge via 4-connectivity.
 *
 * Dual to §5.2 8-connected chains: orthogonal flood cannot squeeze between
 * diagonally adjacent walls, matching a closed polyline through king-neighbors.
 */
export function findExteriorMask(board: Board, wallColor: PlayerColor): boolean[] {
  const total = board.width * board.height;
  const exterior = Array.from({ length: total }, () => false);
  const queue: number[] = [];

  const tryEnqueue = (index: number): void => {
    if (exterior[index] || isActiveWall(board, index, wallColor)) return;
    exterior[index] = true;
    queue.push(index);
  };

  // Border cells (formal perimeter).
  for (let x = 1; x <= board.width; x++) {
    tryEnqueue((1 - 1) * board.width + (x - 1));
    tryEnqueue((board.height - 1) * board.width + (x - 1));
  }
  for (let y = 2; y <= board.height - 1; y++) {
    tryEnqueue((y - 1) * board.width + (1 - 1));
    tryEnqueue((y - 1) * board.width + (board.width - 1));
  }

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const next of neighborIndices4(board, current)) {
      tryEnqueue(next);
    }
  }

  return exterior;
}

/**
 * Contour = active wallColor points that are 8-adjacent to any interior cell.
 * Existing enclosure boundaries remain eligible (§5.8).
 */
export function findClosedContours(
  board: Board,
  wallColor: PlayerColor,
  interior: readonly number[],
): ClosedContour {
  const contour = new Set<number>();
  for (const index of interior) {
    for (const next of neighborIndices8(board, index)) {
      if (isActiveWall(board, next, wallColor)) {
        contour.add(next);
      }
    }
  }
  return { color: wallColor, indices: [...contour] };
}

function regionKind(
  board: Board,
  wallColor: PlayerColor,
  interior: readonly number[],
): EnclosedRegion["kind"] | "ignored" {
  const opponent = classicOpponent(wallColor);
  let hasActiveOpponent = false;
  let hasEmpty = false;

  for (const index of interior) {
    const cell = board.cells[index]!;
    if (cell.color === opponent && !cell.disabled) {
      hasActiveOpponent = true;
    }
    if (cell.color === null && !cell.disabled) {
      hasEmpty = true;
    }
  }

  // §5.5 — capture requires ≥1 opponent point not yet disabled at creation time.
  if (hasActiveOpponent) return "capture";
  // §5.12 — sealed empty / same-color pocket with no opponent → домик.
  if (hasEmpty) return "house";
  // Fully disabled leftover from a prior capture — not a new region.
  return "ignored";
}

/**
 * Find interiors sealed by `wallColor`, classify capture vs домик (§5.5 / §5.12).
 *
 * Expanding interiors from sealed non-wall components (rather than taking the
 * complement of every cycle) follows the minimum-area preference in §5.10:
 * empty lobes separated by a chord become separate house components instead of
 * inflating a neighboring capture.
 */
export function findEnclosedRegions(board: Board, wallColor: PlayerColor): EnclosedRegion[] {
  const exterior = findExteriorMask(board, wallColor);
  const interiorSeeds: number[] = [];

  for (let i = 0; i < board.cells.length; i++) {
    if (!exterior[i] && !isActiveWall(board, i, wallColor)) {
      interiorSeeds.push(i);
    }
  }

  const components = findConnectedComponents(board, interiorSeeds, 4);
  const regions: EnclosedRegion[] = [];

  for (const component of components) {
    const kind = regionKind(board, wallColor, component.indices);
    if (kind === "ignored") continue;
    const contour = findClosedContours(board, wallColor, component.indices);
    regions.push({
      color: wallColor,
      kind,
      interior: component.indices,
      contour,
    });
  }

  return regions;
}
