import type { Board, Cell } from "../types.js";
import { toIndex } from "./coords.js";
import type { Point } from "./coords.js";
import type { PlayerColor } from "../types.js";

export type ColoredPoint = Point & { color: PlayerColor };

function emptyCell(): Cell {
  return { color: null, disabled: false, capturedBy: null };
}

/** Allocate an empty board; optional preset dots are applied afterward. */
export function createEmptyBoard(width: number, height: number): Board {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError(`Invalid board size ${width}×${height}`);
  }

  const cells: Cell[] = Array.from({ length: width * height }, () => emptyCell());
  return { width, height, cells };
}

/** Place dots on an empty board. Throws if a target is occupied or out of bounds. */
export function placeDots(board: Board, dots: readonly ColoredPoint[]): Board {
  const cells = board.cells.map((cell) => ({ ...cell }));

  for (const { x, y, color } of dots) {
    const index = toIndex(board, x, y);
    const cell = cells[index];
    if (!cell) {
      throw new RangeError(`Missing cell at (${x}-${y})`);
    }
    if (cell.color !== null) {
      throw new Error(`Intersection (${x}-${y}) is already occupied`);
    }
    cells[index] = { color, disabled: false, capturedBy: null };
  }

  return { width: board.width, height: board.height, cells };
}

export function getCell(board: Board, x: number, y: number): Cell {
  const cell = board.cells[toIndex(board, x, y)];
  if (!cell) {
    throw new RangeError(`Missing cell at (${x}-${y})`);
  }
  return cell;
}

/** Immutable clone of board cells (shallow per cell). */
export function cloneBoard(board: Board): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells.map((cell) => ({ ...cell })),
  };
}
