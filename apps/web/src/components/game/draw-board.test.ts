import { describe, expect, it } from "vitest";
import type { WireBoard, WireCell } from "@dots/shared";
import { HOVER_PREVIEW_ALPHA, isCellPlayable } from "./draw-board";

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
