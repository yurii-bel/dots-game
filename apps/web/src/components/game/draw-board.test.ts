import { describe, expect, it } from "vitest";
import type { WireBoard, WireCell } from "@dots/shared";
import {
  BOARD_GRID,
  BOARD_PAPER,
  CAPTURED_DOT_SCALE,
  HOVER_PREVIEW_ALPHA,
  LAST_MOVE_INNER_RATIO,
  boardWithoutRevealingCaptures,
  isCellPlayable,
  territoryStrokeWidth,
} from "./draw-board";

function cell(
  partial: Partial<WireCell> = {},
): WireCell {
  return {
    color: null,
    disabled: false,
    capturedBy: null,
    ...partial,
  };
}

function board3(cells: WireCell[]): WireBoard {
  return { width: 3, height: 1, cells };
}

describe("isCellPlayable", () => {
  it("returns true for empty enabled cells", () => {
    const b = board3([cell(), cell(), cell()]);
    expect(isCellPlayable(b, 2, 1)).toBe(true);
  });

  it("returns false for occupied cells", () => {
    const b = board3([cell({ color: "blue" }), cell(), cell()]);
    expect(isCellPlayable(b, 1, 1)).toBe(false);
  });

  it("returns false for disabled (captured) cells", () => {
    const b = board3([
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
      cell(),
      cell(),
    ]);
    expect(isCellPlayable(b, 1, 1)).toBe(false);
  });

  it("returns false when the board has no cells (waiting placeholder)", () => {
    const b: WireBoard = { width: 39, height: 32, cells: [] };
    expect(isCellPlayable(b, 19, 16)).toBe(false);
  });
});

describe("HOVER_PREVIEW_ALPHA", () => {
  it("is 85%", () => {
    expect(HOVER_PREVIEW_ALPHA).toBe(0.85);
  });
});

describe("Task 5 visual constants", () => {
  it("uses a mild captured-dot shrink", () => {
    expect(CAPTURED_DOT_SCALE).toBe(0.85);
  });

  it("scales territory stroke with cell size", () => {
    expect(territoryStrokeWidth(10)).toBe(Math.max(2.5, 10 * 0.18));
    expect(territoryStrokeWidth(8)).toBe(2.5);
  });

  it("marks last move with a 70% white inner disk", () => {
    expect(LAST_MOVE_INNER_RATIO).toBe(0.7);
  });
});

describe("board polish palette", () => {
  it("uses a near-white paper background", () => {
    expect(BOARD_PAPER).toBe("#fafafa");
  });

  it("uses light grey grid lines only", () => {
    expect(BOARD_GRID).toBe("#e5e5e5");
  });
});

describe("boardWithoutRevealingCaptures", () => {
  it("clears capturedBy only on revealing indices", () => {
    const b = board3([
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
      cell({ color: "blue", disabled: true, capturedBy: "red" }),
      cell({ color: "red", disabled: true, capturedBy: "blue" }),
    ]);
    const settled = boardWithoutRevealingCaptures(b, new Set([1]));
    expect(settled.cells[0]?.capturedBy).toBe("blue");
    expect(settled.cells[1]?.capturedBy).toBeNull();
    expect(settled.cells[1]?.disabled).toBe(true);
    expect(settled.cells[1]?.color).toBe("blue");
    expect(settled.cells[2]?.capturedBy).toBe("blue");
  });
});
