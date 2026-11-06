import type { Board, ConnectedComponent } from "../types";
import { neighborIndices4, neighborIndices8 } from "./neighbors";

export type Connectivity = 4 | 8;

/**
 * Find connected components among `seed` indices using 4- or 8-connectivity.
 *
 * Used for opponent groups, interior pockets, and contour clustering.
 */
export function findConnectedComponents(
  board: Pick<Board, "width" | "height">,
  seed: Iterable<number>,
  connectivity: Connectivity = 4,
): ConnectedComponent[] {
  const allowed = new Set(seed);
  const visited = new Set<number>();
  const components: ConnectedComponent[] = [];
  const neighbors = connectivity === 4 ? neighborIndices4 : neighborIndices8;

  for (const start of allowed) {
    if (visited.has(start)) continue;

    const indices: number[] = [];
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.pop()!;
      indices.push(current);
      for (const next of neighbors(board, current)) {
        if (!allowed.has(next) || visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    components.push({ indices });
  }

  return components;
}
