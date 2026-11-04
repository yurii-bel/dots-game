import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeDots } from "../board/create-board.js";
import { toIndex } from "../board/coords.js";
import {
  findConnectedComponents,
  findEnclosedRegions,
  findValidCaptures,
  recalculateScore,
  resolveCapture,
  validateEnclosure,
} from "./index.js";

function boardWith(
  dots: { x: number; y: number; color: "blue" | "red" }[],
  width = 39,
  height = 32,
) {
  return placeDots(createEmptyBoard(width, height), dots);
}

describe("findConnectedComponents", () => {
  it("groups 4-connected seeds", () => {
    const board = createEmptyBoard(5, 5);
    const seeds = [
      toIndex(board, 2, 2),
      toIndex(board, 3, 2),
      toIndex(board, 5, 5),
    ];
    const components = findConnectedComponents(board, seeds, 4);
    expect(components).toHaveLength(2);
    expect(components.some((c) => c.indices.length === 2)).toBe(true);
    expect(components.some((c) => c.indices.length === 1)).toBe(true);
  });
});

describe("enclosure pipeline", () => {
  it("finds a capture region for the minimum plus shape", () => {
    const board = boardWith([
      { x: 10, y: 10, color: "red" },
      { x: 10, y: 11, color: "blue" },
      { x: 9, y: 10, color: "blue" },
      { x: 11, y: 10, color: "blue" },
      { x: 10, y: 9, color: "blue" },
    ]);

    const captures = findValidCaptures(board, "blue");
    expect(captures).toHaveLength(1);
    expect(captures[0]!.interior).toContain(toIndex(board, 10, 10));
    expect(validateEnclosure(board, captures[0]!)).toBe(true);

    const next = resolveCapture(board, captures);
    const scores = recalculateScore(next);
    expect(scores).toEqual({ blue: 1, red: 0 });
    expect(next.cells[toIndex(next, 10, 10)]!.disabled).toBe(true);
  });

  it("classifies empty sealed pockets as houses", () => {
    const board = boardWith([
      { x: 10, y: 11, color: "blue" },
      { x: 9, y: 10, color: "blue" },
      { x: 11, y: 10, color: "blue" },
      { x: 10, y: 9, color: "blue" },
    ]);

    const regions = findEnclosedRegions(board, "blue");
    expect(regions.some((r) => r.kind === "house")).toBe(true);
    expect(regions.some((r) => r.kind === "capture")).toBe(false);
  });
});
