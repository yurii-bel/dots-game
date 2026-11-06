import { describe, expect, it } from "vitest";
import type { WireBoard, WireCell } from "@dots/shared";
import { buildTerritoryPaths, orderContourCycle } from "./territory-paths";

function emptyCell(): WireCell {
  return { color: null, disabled: false, capturedBy: null };
}

function wall(color: "blue" | "red"): WireCell {
  return { color, disabled: false, capturedBy: null };
}

function captured(color: "blue" | "red", by: "blue" | "red"): WireCell {
  return { color, disabled: true, capturedBy: by };
}

/** 5×5 board with a red octagon-ish ring around one blue interior at (3,3). */
function smallRedCapture(): WireBoard {
  const width = 5;
  const height = 5;
  const cells: WireCell[] = Array.from({ length: width * height }, emptyCell);

  const set = (x: number, y: number, cell: WireCell) => {
    cells[(y - 1) * width + (x - 1)] = cell;
  };

  // Red contour (8-connected ring)
  for (const [x, y] of [
    [2, 2],
    [3, 2],
    [4, 2],
    [2, 3],
    [4, 3],
    [2, 4],
    [3, 4],
    [4, 4],
  ] as const) {
    set(x, y, wall("red"));
  }
  // Captured blue interior
  set(3, 3, captured("blue", "red"));

  return { width, height, cells };
}

describe("buildTerritoryPaths", () => {
  it("returns empty when board has no cells", () => {
    expect(
      buildTerritoryPaths({ width: 39, height: 32, cells: [] }),
    ).toEqual([]);
  });

  it("builds a closed red polygon around a captured interior", () => {
    const paths = buildTerritoryPaths(smallRedCapture());
    expect(paths).toHaveLength(1);
    expect(paths[0]!.color).toBe("red");
    expect(paths[0]!.interiorCount).toBe(1);
    expect(paths[0]!.points.length).toBeGreaterThanOrEqual(4);
    // Closed cycle — first≠last in list; Canvas closePath joins them.
    const pts = paths[0]!.points;
    const keys = new Set(pts.map((p) => `${p.x},${p.y}`));
    expect(keys.size).toBe(pts.length);
  });

  it("size-sorts nested / multiple regions ascending (P1)", () => {
    const width = 9;
    const height = 5;
    const cells: WireCell[] = Array.from({ length: width * height }, emptyCell);
    const set = (x: number, y: number, cell: WireCell) => {
      cells[(y - 1) * width + (x - 1)] = cell;
    };

    // Left small red capture: one interior
    for (const [x, y] of [
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 3],
      [3, 3],
      [1, 4],
      [2, 4],
      [3, 4],
    ] as const) {
      set(x, y, wall("red"));
    }
    set(2, 3, captured("blue", "red"));

    // Right larger blue capture: two interiors
    for (const [x, y] of [
      [5, 2],
      [6, 2],
      [7, 2],
      [8, 2],
      [5, 3],
      [8, 3],
      [5, 4],
      [6, 4],
      [7, 4],
      [8, 4],
    ] as const) {
      set(x, y, wall("blue"));
    }
    set(6, 3, captured("red", "blue"));
    set(7, 3, captured("red", "blue"));

    const paths = buildTerritoryPaths({ width, height, cells });
    expect(paths.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < paths.length; i += 1) {
      expect(paths[i]!.interiorCount).toBeGreaterThanOrEqual(
        paths[i - 1]!.interiorCount,
      );
    }
    expect(paths[0]!.interiorCount).toBe(1);
  });
});

describe("orderContourCycle", () => {
  it("returns a cycle of length >= 3 for an octagon ring", () => {
    const board = { width: 5, height: 5 };
    // Walls around (3,3): index = (y-1)*5+(x-1)
    const walls = [6, 7, 8, 11, 13, 16, 17, 18];
    const interior = [12];
    const ordered = orderContourCycle(board, walls, interior);
    expect(ordered.length).toBe(8);
    expect(new Set(ordered).size).toBe(8);
  });
});
