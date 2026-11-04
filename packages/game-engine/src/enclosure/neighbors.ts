import type { Board, PlayerColor } from "../types.js";
import { fromIndex, isInBounds, toIndex } from "../board/coords.js";

/** Orthogonal (4-connected) deltas — used for region flood-fill dual to 8-chains. */
export const ORTHOGONAL_DELTAS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;

/** King-move (8-connected) deltas — chain adjacency per §5.2 / terminology §3.1. */
export const KING_DELTAS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
] as const;

export function neighborIndices4(board: Pick<Board, "width" | "height">, index: number): number[] {
  const { x, y } = fromIndex(board, index);
  const result: number[] = [];
  for (const { dx, dy } of ORTHOGONAL_DELTAS) {
    const nx = x + dx;
    const ny = y + dy;
    if (isInBounds(board, nx, ny)) {
      result.push(toIndex(board, nx, ny));
    }
  }
  return result;
}

export function neighborIndices8(board: Pick<Board, "width" | "height">, index: number): number[] {
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

/** True when the cell is an active (non-disabled) point of `color` — a chain wall (§5.2). */
export function isActiveWall(board: Board, index: number, color: PlayerColor): boolean {
  const cell = board.cells[index];
  return cell !== undefined && cell.color === color && !cell.disabled;
}
