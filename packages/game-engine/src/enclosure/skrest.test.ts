import { describe, expect, it } from "vitest";
import { createEmptyBoard, placeDots } from "../board/create-board.js";
import { toIndex } from "../board/coords.js";
import {
  findConnectedComponents,
  findEnclosedRegions,
  findExteriorMask,
  findValidCaptures,
  isActiveWall,
  neighborIndices8,
} from "./index.js";

/**
 * Скрест (terminology §3.12) — two crossing diagonal links of different colors.
 *
 * Formal §3.8: diagonal links are *passable* and may intersect. The engine's
 * 8-wall / 4-flood dual already encodes that mutual control: both colors keep
 * their diagonal chain link, while orthogonal flood cannot slip through the
 * crossed cell. No extra blocking graph is required.
 *
 * These fixtures would only "need" an invented single-winner diagonal rule if
 * the dual were wrong; under the dual they pass as-is.
 */
describe("скрест / passable diagonal dual (terminology §3.8 / §3.12)", () => {
  function skrestBoard() {
    // Cell corners: blue (10,10)–(11,11) and red (10,11)–(11,10) form a скрест.
    return placeDots(createEmptyBoard(39, 32), [
      { x: 10, y: 10, color: "blue" },
      { x: 11, y: 11, color: "blue" },
      { x: 10, y: 11, color: "red" },
      { x: 11, y: 10, color: "red" },
    ]);
  }

  it("keeps both colors' diagonal chain links through a скрест", () => {
    const board = skrestBoard();
    const b0 = toIndex(board, 10, 10);
    const b1 = toIndex(board, 11, 11);
    const r0 = toIndex(board, 10, 11);
    const r1 = toIndex(board, 11, 10);

    expect(neighborIndices8(board, b0)).toContain(b1);
    expect(neighborIndices8(board, r0)).toContain(r1);

    const blueComp = findConnectedComponents(board, [b0, b1], 8);
    const redComp = findConnectedComponents(board, [r0, r1], 8);
    expect(blueComp).toHaveLength(1);
    expect(redComp).toHaveLength(1);
    expect(blueComp[0]!.indices).toHaveLength(2);
    expect(redComp[0]!.indices).toHaveLength(2);
  });

  it("lets 4-flood treat a скрест as mutual control (no orthogonal slip)", () => {
    const board = skrestBoard();
    // From south of the X, orthogonal flood with blue walls cannot reach north
    // through the crossed diagonals — red's stones are not blue walls, but the
    // blue diagonal alone already seals orthogonal passage between (10,10) and
    // (11,11). Adding the rest of a blue ring captures red when closed.
    const withRing = placeDots(createEmptyBoard(39, 32), [
      { x: 10, y: 10, color: "blue" },
      { x: 11, y: 11, color: "blue" },
      { x: 10, y: 11, color: "red" },
      { x: 11, y: 10, color: "red" },
      // Complete a blue enclosure that uses both diagonal links of the скрест
      // plus orthogonal fillers around the red pair.
      { x: 9, y: 10, color: "blue" },
      { x: 9, y: 11, color: "blue" },
      { x: 10, y: 12, color: "blue" },
      { x: 11, y: 12, color: "blue" },
      { x: 12, y: 11, color: "blue" },
      { x: 12, y: 10, color: "blue" },
      { x: 11, y: 9, color: "blue" },
      { x: 10, y: 9, color: "blue" },
    ]);

    const exterior = findExteriorMask(withRing, "blue");
    expect(exterior[toIndex(withRing, 10, 11)]).toBe(false);
    expect(exterior[toIndex(withRing, 11, 10)]).toBe(false);

    const captures = findValidCaptures(withRing, "blue");
    expect(captures.some((r) => r.interior.includes(toIndex(withRing, 10, 11)))).toBe(
      true,
    );
    expect(captures.some((r) => r.interior.includes(toIndex(withRing, 11, 10)))).toBe(
      true,
    );

    // Blue contour stones stay active walls (not interior).
    expect(isActiveWall(withRing, toIndex(withRing, 10, 10), "blue")).toBe(true);
    expect(isActiveWall(withRing, toIndex(withRing, 11, 11), "blue")).toBe(true);
  });

  it("initial cross is itself a скрест and does not auto-capture", () => {
    // Official §4.3 cross: blue 20-17 / 21-16, red 20-16 / 21-17.
    const board = placeDots(createEmptyBoard(39, 32), [
      { x: 20, y: 17, color: "blue" },
      { x: 21, y: 16, color: "blue" },
      { x: 20, y: 16, color: "red" },
      { x: 21, y: 17, color: "red" },
    ]);

    expect(findEnclosedRegions(board, "blue")).toHaveLength(0);
    expect(findEnclosedRegions(board, "red")).toHaveLength(0);
    expect(findValidCaptures(board, "blue")).toHaveLength(0);
    expect(findValidCaptures(board, "red")).toHaveLength(0);

    const blue = findConnectedComponents(
      board,
      [toIndex(board, 20, 17), toIndex(board, 21, 16)],
      8,
    );
    const red = findConnectedComponents(
      board,
      [toIndex(board, 20, 16), toIndex(board, 21, 17)],
      8,
    );
    expect(blue).toHaveLength(1);
    expect(red).toHaveLength(1);
  });
});
