import { describe, expect, it } from "vitest";
import {
  AXIS_PAD_BOTTOM,
  AXIS_PAD_LEFT,
  canvasToFormal,
  computeLayout,
  formalToCanvas,
} from "./board-geometry";

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

  it("reserves left/bottom pad for axis labels", () => {
    const layout = computeLayout(board, 800, 640);
    expect(layout.padLeft).toBe(AXIS_PAD_LEFT);
    expect(layout.padBottom).toBe(AXIS_PAD_BOTTOM);
    expect(layout.originX).toBe(AXIS_PAD_LEFT);
  });

  it("snaps mid-cell pointer to nearest intersection (no dead zone)", () => {
    const layout = computeLayout(board, 800, 640);
    const a = formalToCanvas(layout, board, 10, 10);
    const b = formalToCanvas(layout, board, 11, 10);
    const midX = (a.cx + b.cx) / 2;
    const midY = a.cy;
    // Halfway between 10 and 11 — still a hit (ghost must not vanish)
    const hit = canvasToFormal(layout, board, midX, midY);
    expect(hit).not.toBeNull();
    expect(hit!.y).toBe(10);
    expect([10, 11]).toContain(hit!.x);
  });

  it("clamps to board edges inside the padded canvas", () => {
    const layout = computeLayout(board, 800, 640);
    const hit = canvasToFormal(layout, board, 1, layout.cssHeight - 1);
    expect(hit).toEqual({ x: 1, y: 1 });
  });

  it("returns null only outside the canvas bounds", () => {
    const layout = computeLayout(board, 800, 640);
    expect(canvasToFormal(layout, board, -1, 10)).toBeNull();
    expect(canvasToFormal(layout, board, layout.cssWidth + 1, 10)).toBeNull();
  });
});
