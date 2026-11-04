import type { Board } from "../types.js";

/** Formal 1-based point. */
export type Point = Readonly<{ x: number; y: number }>;

export function isInBounds(board: Pick<Board, "width" | "height">, x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 1 &&
    y >= 1 &&
    x <= board.width &&
    y <= board.height
  );
}

/** Flat index for formal (x, y). Throws if out of bounds. */
export function toIndex(board: Pick<Board, "width" | "height">, x: number, y: number): number {
  if (!isInBounds(board, x, y)) {
    throw new RangeError(
      `Coordinate (${x}-${y}) is outside the ${board.width}×${board.height} board`,
    );
  }
  return (y - 1) * board.width + (x - 1);
}

export function fromIndex(
  board: Pick<Board, "width" | "height">,
  index: number,
): Point {
  if (!Number.isInteger(index) || index < 0 || index >= board.width * board.height) {
    throw new RangeError(`Cell index ${index} is outside the ${board.width}×${board.height} board`);
  }
  const x = (index % board.width) + 1;
  const y = Math.floor(index / board.width) + 1;
  return { x, y };
}

/** Formal notation "20-17". */
export function formatPoint(x: number, y: number): string {
  return `${x}-${y}`;
}
