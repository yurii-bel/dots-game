import { describe, expect, it } from "vitest";
import { fromIndex, isInBounds, toIndex } from "./coords";

const board = { width: 39, height: 32 };

describe("formal coordinates", () => {
  it("maps 1-based corners and center of the initial cross", () => {
    expect(toIndex(board, 1, 1)).toBe(0);
    expect(toIndex(board, 39, 1)).toBe(38);
    expect(toIndex(board, 1, 32)).toBe(39 * 31);
    expect(toIndex(board, 20, 16)).toBe((16 - 1) * 39 + (20 - 1));
    expect(fromIndex(board, toIndex(board, 21, 17))).toEqual({ x: 21, y: 17 });
  });

  it("treats only 1..width / 1..height as in-bounds", () => {
    expect(isInBounds(board, 0, 1)).toBe(false);
    expect(isInBounds(board, 1, 0)).toBe(false);
    expect(isInBounds(board, 40, 1)).toBe(false);
    expect(isInBounds(board, 1, 33)).toBe(false);
    expect(isInBounds(board, 39, 32)).toBe(true);
  });
});
