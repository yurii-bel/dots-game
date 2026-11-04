import { describe, expect, it } from "vitest";
import { canvasToFormal, computeLayout, formalToCanvas } from "./board-geometry";

describe("board geometry", () => {
  const board = { width: 39, height: 32 };

  it("round-trips formal ↔ canvas near center", () => {
    const layout = computeLayout(board, 800, 640);
    const { cx, cy } = formalToCanvas(layout, board, 20, 16);
    const back = canvasToFormal(layout, board, cx, cy);
    expect(back).toEqual({ x: 20, y: 16 });
  });

  it("maps y=1 to bottom of canvas", () => {
    const layout = computeLayout(board, 800, 640);
    const bottom = formalToCanvas(layout, board, 1, 1);
    const top = formalToCanvas(layout, board, 1, 32);
    expect(bottom.cy).toBeGreaterThan(top.cy);
  });
});
