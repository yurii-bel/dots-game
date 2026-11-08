import type { Board, PlayerColor } from "../types";
import { fromIndex, isInBounds, toIndex } from "../board/coords";
import { findConnectedComponents } from "./find-connected-components";

/** Formal coordinate (may be half-integer for perimeter vertices). */
export type FormalPoint = { x: number; y: number };

/**
 * One captured territory body for a single `capturedBy` owner.
 * `rings[0]` is typically the outer boundary; further rings are holes.
 * Vertices sit on the half-cell perimeter of the captured intersection set.
 */
export type CapturedTerritoryContour = {
  color: PlayerColor;
  /** Closed rings (first≠last; caller closes the path). Formal coords. */
  rings: FormalPoint[][];
  /** Number of captured cells in this 4-connected component. */
  interiorCount: number;
};

type Vertex = FormalPoint;

function vertexKey(v: Vertex): string {
  return `${v.x},${v.y}`;
}

function edgeKey(a: Vertex, b: Vertex): string {
  return `${vertexKey(a)}>${vertexKey(b)}`;
}

/** Whether formal cell (x,y) is in the captured index set (board-bounds safe). */
function hasCell(
  board: Pick<Board, "width" | "height">,
  set: ReadonlySet<number>,
  x: number,
  y: number,
): boolean {
  if (!isInBounds(board, x, y)) return false;
  return set.has(toIndex(board, x, y));
}

/**
 * Directed boundary edges of the union of unit squares centered on `indices`,
 * oriented so the captured set stays on the left (y-up → CCW outer / CW holes).
 */
function collectDirectedEdges(
  board: Pick<Board, "width" | "height">,
  indices: readonly number[],
): Map<string, Vertex[]> {
  const set = new Set(indices);
  const outgoing = new Map<string, Vertex[]>();

  const addEdge = (from: Vertex, to: Vertex): void => {
    const k = vertexKey(from);
    const list = outgoing.get(k);
    if (list) list.push(to);
    else outgoing.set(k, [to]);
  };

  for (const index of indices) {
    const { x, y } = fromIndex(board, index);
    const L = x - 0.5;
    const R = x + 0.5;
    const B = y - 0.5;
    const T = y + 0.5;

    // South face — travel east (interior north = left).
    if (!hasCell(board, set, x, y - 1)) {
      addEdge({ x: L, y: B }, { x: R, y: B });
    }
    // East face — travel north (interior west = left).
    if (!hasCell(board, set, x + 1, y)) {
      addEdge({ x: R, y: B }, { x: R, y: T });
    }
    // North face — travel west (interior south = left).
    if (!hasCell(board, set, x, y + 1)) {
      addEdge({ x: R, y: T }, { x: L, y: T });
    }
    // West face — travel south (interior east = left).
    if (!hasCell(board, set, x - 1, y)) {
      addEdge({ x: L, y: T }, { x: L, y: B });
    }
  }

  return outgoing;
}

/**
 * At a vertex, pick the unused outgoing edge with the leftmost turn
 * relative to the arrival direction (y-up).
 */
function pickLeftmost(
  from: Vertex,
  to: Vertex,
  candidates: readonly Vertex[],
  used: ReadonlySet<string>,
): Vertex | null {
  const ix = to.x - from.x;
  const iy = to.y - from.y;
  let best: Vertex | null = null;
  let bestScore = -Infinity;

  for (const next of candidates) {
    if (used.has(edgeKey(to, next))) continue;
    const ox = next.x - to.x;
    const oy = next.y - to.y;
    // atan2(cross, dot) — larger = more CCW (left) turn.
    const cross = ix * oy - iy * ox;
    const dot = ix * ox + iy * oy;
    const turn = Math.atan2(cross, dot);
    if (turn > bestScore) {
      bestScore = turn;
      best = next;
    }
  }

  return best;
}

/** Drop collinear midpoints so axis-aligned sides become two endpoints. */
function simplifyCollinear(ring: FormalPoint[]): FormalPoint[] {
  if (ring.length < 3) return ring;
  const out: FormalPoint[] = [];
  const n = ring.length;
  for (let i = 0; i < n; i += 1) {
    const prev = ring[(i - 1 + n) % n]!;
    const curr = ring[i]!;
    const next = ring[(i + 1) % n]!;
    const cross =
      (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 1e-9) out.push(curr);
  }
  return out.length >= 3 ? out : ring;
}

/** Walk every directed edge exactly once into closed rings. */
function traceRings(outgoing: Map<string, Vertex[]>): FormalPoint[][] {
  const used = new Set<string>();
  const rings: FormalPoint[][] = [];

  for (const [startKey, starts] of outgoing) {
    for (const firstTo of starts) {
      const [sx, sy] = startKey.split(",").map(Number) as [number, number];
      const start: Vertex = { x: sx, y: sy };
      if (used.has(edgeKey(start, firstTo))) continue;

      const ring: FormalPoint[] = [{ x: start.x, y: start.y }];
      let prev = start;
      let curr = firstTo;
      // Safety: perimeter edges ≤ 4 × cell count.
      const limit = outgoing.size * 4 + 8;

      for (let step = 0; step < limit; step += 1) {
        used.add(edgeKey(prev, curr));
        ring.push({ x: curr.x, y: curr.y });

        const candidates = outgoing.get(vertexKey(curr)) ?? [];
        const next = pickLeftmost(prev, curr, candidates, used);
        if (next === null) break;

        if (next.x === start.x && next.y === start.y) {
          used.add(edgeKey(curr, next));
          // Closed — omit duplicate start at end (Canvas closePath).
          if (ring.length >= 3) rings.push(simplifyCollinear(ring));
          break;
        }

        prev = curr;
        curr = next;
      }
    }
  }

  return rings;
}

/**
 * Half-cell perimeter rings for one captured component (outer + holes).
 * Used by the web R1 hybrid fallback when live capturer walls are missing
 * (typical after §8.4 perfect-fill landing forfeits).
 */
export function buildHalfCellRingsForIndices(
  board: Pick<Board, "width" | "height">,
  indices: readonly number[],
): FormalPoint[][] {
  if (indices.length === 0) return [];
  return traceRings(collectDirectedEdges(board, indices));
}

/**
 * Build half-cell perimeter contours for every `capturedBy` territory.
 *
 * Geometry only — does **not** re-run enclosure / §8.4 detection. Input is the
 * authoritative captured cell set already written by the engine.
 *
 * Sorted ascending by interior size (draw small on top for nested re-tags).
 */
export function buildCapturedTerritoryContours(
  board: Board,
): CapturedTerritoryContour[] {
  if (board.cells.length === 0) return [];

  const result: CapturedTerritoryContour[] = [];

  for (const color of ["blue", "red"] as const) {
    const interiors: number[] = [];
    for (let i = 0; i < board.cells.length; i += 1) {
      if (board.cells[i]?.capturedBy === color) interiors.push(i);
    }
    if (interiors.length === 0) continue;

    const components = findConnectedComponents(board, interiors, 4);
    for (const component of components) {
      const rings = buildHalfCellRingsForIndices(board, component.indices);
      if (rings.length === 0) continue;
      result.push({
        color,
        rings,
        interiorCount: component.indices.length,
      });
    }
  }

  result.sort((a, b) => a.interiorCount - b.interiorCount);
  return result;
}
