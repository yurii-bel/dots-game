import { describe, expect, it } from "vitest";
import type { WireBoard, WireCell } from "@dots/shared";
import { buildTerritoryPaths } from "./territory-paths";

function emptyCell(): WireCell {
  return { color: null, disabled: false, capturedBy: null };
}

function captured(color: "blue" | "red", by: "blue" | "red"): WireCell {
  return { color, disabled: true, capturedBy: by };
}

/** Lone §8.4-style capture — no capturer walls on the board. */
function loneLandingCapture(): WireBoard {
  const width = 5;
  const height = 5;
  const cells: WireCell[] = Array.from({ length: width * height }, emptyCell);
  cells[(3 - 1) * width + (3 - 1)] = captured("blue", "red");
  return { width, height, cells };
}

describe("buildTerritoryPaths", () => {
  it("returns empty when board has no cells", () => {
    expect(
      buildTerritoryPaths({ width: 39, height: 32, cells: [] }),
    ).toEqual([]);
  });

  it("builds a half-cell square for a lone captured cell (no walls)", () => {
    const paths = buildTerritoryPaths(loneLandingCapture());
    expect(paths).toHaveLength(1);
    expect(paths[0]!.color).toBe("red");
    expect(paths[0]!.interiorCount).toBe(1);
    expect(paths[0]!.rings).toHaveLength(1);
    expect(paths[0]!.rings[0]!).toHaveLength(4);
    const keys = new Set(paths[0]!.rings[0]!.map((p) => `${p.x},${p.y}`));
    expect(keys).toEqual(
      new Set(["2.5,2.5", "3.5,2.5", "3.5,3.5", "2.5,3.5"]),
    );
  });

  it("size-sorts nested / multiple regions ascending (P1)", () => {
    const width = 9;
    const height = 5;
    const cells: WireCell[] = Array.from({ length: width * height }, emptyCell);
    const set = (x: number, y: number, cell: WireCell) => {
      cells[(y - 1) * width + (x - 1)] = cell;
    };

    set(2, 3, captured("blue", "red"));
    set(6, 3, captured("red", "blue"));
    set(7, 3, captured("red", "blue"));

    const paths = buildTerritoryPaths({ width, height, cells });
    expect(paths.length).toBe(2);
    expect(paths[0]!.interiorCount).toBe(1);
    expect(paths[1]!.interiorCount).toBe(2);
  });

  it("includes hole rings for a doughnut capture set", () => {
    const width = 5;
    const height = 5;
    const cells: WireCell[] = Array.from({ length: width * height }, emptyCell);
    const set = (x: number, y: number, cell: WireCell) => {
      cells[(y - 1) * width + (x - 1)] = cell;
    };
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
      set(x, y, captured("red", "blue"));
    }

    const paths = buildTerritoryPaths({ width, height, cells });
    expect(paths).toHaveLength(1);
    expect(paths[0]!.rings.length).toBe(2);
  });
});
