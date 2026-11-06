import {
  findClosedContours,
  findConnectedComponents,
  fromIndex,
  isInBounds,
  toIndex,
  type Board,
  type PlayerColor,
} from "@dots/game-engine";
import type { WireBoard } from "@dots/shared";

export type TerritoryPath = {
  color: PlayerColor;
  /** Formal 1-based points in CCW (or consistent) cycle order for Canvas path. */
  points: { x: number; y: number }[];
  /** Interior cell count — used to size-sort nested regions (draw small on top). */
  interiorCount: number;
};

const KING_DELTAS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
] as const;

function asBoard(board: WireBoard): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells,
  };
}

/** Local 8-neighbor indices (mirrors engine; avoids expanding engine public API). */
function neighborIndices8(
  board: Pick<Board, "width" | "height">,
  index: number,
): number[] {
  const { x, y } = fromIndex(board, index);
  const result: number[] = [];
  for (const { dx, dy } of KING_DELTAS) {
    const nx = x + dx;
    const ny = y + dy;
    if (isInBounds(board, nx, ny)) {
      result.push(toIndex(board, nx, ny));
    }
  }
  return result;
}

/** Contour walls that touch something outside this enclosure (drop internal chords). */
function outlineContourIndices(
  board: Pick<Board, "width" | "height">,
  contour: ReadonlySet<number>,
  interior: ReadonlySet<number>,
): number[] {
  const outline: number[] = [];
  for (const index of contour) {
    const touchesOutside = neighborIndices8(board, index).some(
      (n) => !contour.has(n) && !interior.has(n),
    );
    if (touchesOutside) outline.push(index);
  }
  // Degenerate: fall back to full contour set.
  return outline.length >= 3 ? outline : [...contour];
}

function centroidOf(
  board: Pick<Board, "width" | "height">,
  indices: readonly number[],
): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const index of indices) {
    const p = fromIndex(board, index);
    sx += p.x;
    sy += p.y;
  }
  const n = Math.max(1, indices.length);
  return { x: sx / n, y: sy / n };
}

/**
 * Order outline walls into a closed cycle via left-hand walk.
 * Falls back to angular sort around the interior centroid.
 */
export function orderContourCycle(
  board: Pick<Board, "width" | "height">,
  contourIndices: readonly number[],
  interiorIndices: readonly number[],
): number[] {
  if (contourIndices.length < 3) return [...contourIndices];

  const contour = new Set(contourIndices);
  const interior = new Set(interiorIndices);
  const outline = outlineContourIndices(board, contour, interior);
  const outlineSet = new Set(outline);
  const center = centroidOf(board, interiorIndices);

  const start = outline.reduce((best, index) => {
    const p = fromIndex(board, index);
    const b = fromIndex(board, best);
    // Southern-most then western-most in formal coords (y up → prefer small y).
    if (p.y < b.y || (p.y === b.y && p.x < b.x)) return index;
    return best;
  });

  const path: number[] = [start];
  const visited = new Set<number>([start]);
  let current = start;
  let prevX = fromIndex(board, start).x;
  let prevY = fromIndex(board, start).y - 1; // pretend we arrived from below

  for (let step = 0; step < outline.length + 2; step += 1) {
    const cur = fromIndex(board, current);
    const ix = cur.x - prevX;
    const iy = cur.y - prevY;
    const canClose =
      path.length >= 3 && visited.size >= outlineSet.size;

    let bestNext: number | null = null;
    let bestScore = -Infinity;

    for (const next of neighborIndices8(board, current)) {
      if (!outlineSet.has(next)) continue;
      // Do not close early via diagonal shortcuts — visit every outline wall first.
      if (visited.has(next)) {
        if (!(next === start && canClose)) continue;
      }

      const nxt = fromIndex(board, next);
      const ox = nxt.x - cur.x;
      const oy = nxt.y - cur.y;
      const isDiag = Math.abs(ox) + Math.abs(oy) > 1;
      // Prefer orthogonal steps so we don't skip outline vertices.
      const orthoBonus = isDiag ? 0 : 4;
      // CCW turn angle from incoming direction (formal y-up).
      const cross = ix * oy - iy * ox;
      const dot = ix * ox + iy * oy;
      const turn = Math.atan2(cross, dot);
      // Prefer edges that keep the interior centroid on the left.
      const crossCent = ox * (center.y - cur.y) - oy * (center.x - cur.x);
      const score = orthoBonus + (crossCent >= -1e-6 ? 10 : 0) + turn;

      if (score > bestScore) {
        bestScore = score;
        bestNext = next;
      }
    }

    if (bestNext === null) break;
    if (bestNext === start && canClose) {
      return path;
    }
    path.push(bestNext);
    visited.add(bestNext);
    prevX = cur.x;
    prevY = cur.y;
    current = bestNext;
  }

  if (path.length >= 3 && visited.size >= outlineSet.size) {
    return path;
  }

  // Angular fallback around interior centroid (stable for convex rings).
  return [...outline].sort((a, b) => {
    const pa = fromIndex(board, a);
    const pb = fromIndex(board, b);
    return (
      Math.atan2(pa.y - center.y, pa.x - center.x) -
      Math.atan2(pb.y - center.y, pb.x - center.x)
    );
  });
}

/**
 * Build closed territory polygons from `capturedBy` cell flags.
 * Sorted ascending by interior size (P1 nesting — draw small on top).
 */
export function buildTerritoryPaths(board: WireBoard): TerritoryPath[] {
  if (board.cells.length === 0) return [];

  const engineBoard = asBoard(board);
  const paths: TerritoryPath[] = [];

  for (const color of ["blue", "red"] as const) {
    const interiors: number[] = [];
    for (let i = 0; i < board.cells.length; i += 1) {
      if (board.cells[i]?.capturedBy === color) interiors.push(i);
    }
    if (interiors.length === 0) continue;

    const components = findConnectedComponents(engineBoard, interiors, 4);
    for (const component of components) {
      const closed = findClosedContours(engineBoard, color, component.indices);
      if (closed.indices.length < 3) continue;
      const ordered = orderContourCycle(
        engineBoard,
        closed.indices,
        component.indices,
      );
      if (ordered.length < 3) continue;
      paths.push({
        color,
        interiorCount: component.indices.length,
        points: ordered.map((index) => fromIndex(engineBoard, index)),
      });
    }
  }

  paths.sort((a, b) => a.interiorCount - b.interiorCount);
  return paths;
}
