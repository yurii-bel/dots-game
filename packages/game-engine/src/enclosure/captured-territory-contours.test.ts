import { describe, expect, it } from "vitest";
import { createEmptyBoard, toIndex } from "../board/index";
import type { Board, PlayerColor } from "../types";
import { buildCapturedTerritoryContours } from "./captured-territory-contours";

function markCaptured(board: Board, x: number, y: number, by: PlayerColor): void {
  const i = toIndex(board, x, y);
  board.cells[i] = {
    color: by === "blue" ? "red" : "blue",
    disabled: true,
    capturedBy: by,
  };
}

describe("buildCapturedTerritoryContours", () => {
  it("returns empty for an empty board", () => {
    const board = createEmptyBoard(5, 5);
    expect(buildCapturedTerritoryContours(board)).toEqual([]);
  });

  it("builds a 4-vertex half-cell square around a lone §8.4-style capture (no walls)", () => {
    const board = createEmptyBoard(5, 5);
    markCaptured(board, 3, 3, "red");

    const contours = buildCapturedTerritoryContours(board);
    expect(contours).toHaveLength(1);
    expect(contours[0]!.color).toBe("red");
    expect(contours[0]!.interiorCount).toBe(1);
    expect(contours[0]!.rings).toHaveLength(1);

    const ring = contours[0]!.rings[0]!;
    expect(ring).toHaveLength(4);
    const keys = new Set(ring.map((p) => `${p.x},${p.y}`));
    expect(keys).toEqual(
      new Set(["2.5,2.5", "3.5,2.5", "3.5,3.5", "2.5,3.5"]),
    );
  });

  it("emits separate contours for disconnected regions", () => {
    const board = createEmptyBoard(9, 5);
    markCaptured(board, 2, 3, "red");
    markCaptured(board, 7, 3, "red");

    const contours = buildCapturedTerritoryContours(board);
    expect(contours).toHaveLength(2);
    expect(contours.every((c) => c.color === "red")).toBe(true);
    expect(contours.every((c) => c.interiorCount === 1)).toBe(true);
  });

  it("emits outer + hole rings for a doughnut (even-odd)", () => {
    // 3×3 frame of red captures around empty center (2,2) on a 3×3 board of interiors.
    // Cells: all of [1..3]×[1..3] except (2,2).
    const board = createEmptyBoard(5, 5);
    for (const [x, y] of [
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [3, 2],
      [1, 3],
      [2, 3],
      [3, 3],
    ] as const) {
      markCaptured(board, x, y, "blue");
    }

    const contours = buildCapturedTerritoryContours(board);
    expect(contours).toHaveLength(1);
    expect(contours[0]!.interiorCount).toBe(8);
    expect(contours[0]!.rings.length).toBe(2);

    // Outer rect around the 3×3 block + inner hole around (2,2) — both 4 verts.
    expect(contours[0]!.rings.every((r) => r.length === 4)).toBe(true);

    const allKeys = new Set(
      contours[0]!.rings.flatMap((r) => r.map((p) => `${p.x},${p.y}`)),
    );
    // Outer corners
    expect(allKeys.has("0.5,0.5")).toBe(true);
    expect(allKeys.has("3.5,3.5")).toBe(true);
    // Inner hole around empty (2,2)
    expect(allKeys.has("1.5,1.5")).toBe(true);
    expect(allKeys.has("2.5,2.5")).toBe(true);
  });

  it("size-sorts nested / multi-owner regions ascending", () => {
    const board = createEmptyBoard(9, 5);
    markCaptured(board, 2, 3, "red");
    markCaptured(board, 6, 3, "blue");
    markCaptured(board, 7, 3, "blue");

    const contours = buildCapturedTerritoryContours(board);
    expect(contours.length).toBe(2);
    expect(contours[0]!.interiorCount).toBe(1);
    expect(contours[1]!.interiorCount).toBe(2);
  });

  it("merges orthogonally adjacent cells into one outer ring", () => {
    const board = createEmptyBoard(5, 5);
    markCaptured(board, 2, 3, "red");
    markCaptured(board, 3, 3, "red");

    const contours = buildCapturedTerritoryContours(board);
    expect(contours).toHaveLength(1);
    expect(contours[0]!.interiorCount).toBe(2);
    expect(contours[0]!.rings).toHaveLength(1);
    // 1×2 block → axis-aligned rectangle (collinear midpoints simplified).
    expect(contours[0]!.rings[0]!).toHaveLength(4);
  });
});
