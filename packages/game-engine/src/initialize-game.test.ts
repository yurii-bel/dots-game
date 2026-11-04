import { describe, expect, it } from "vitest";
import {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_FIRST_PLAYER,
  CLASSIC_INITIAL_CROSS,
  CLASSIC_RULESET_VERSION,
  getCell,
  initializeGame,
  toIndex,
} from "./index.js";

describe("initializeGame (classic)", () => {
  const game = initializeGame({
    width: CLASSIC_BOARD_WIDTH,
    height: CLASSIC_BOARD_HEIGHT,
    ruleset: "classic",
  });

  it("uses classic ruleset metadata and version", () => {
    expect(game.ruleset).toBe("classic");
    expect(game.rulesetVersion).toBe(CLASSIC_RULESET_VERSION);
    expect(game.status).toBe("in_progress");
    expect(game.moveNumber).toBe(0);
  });

  it("creates a 39×32 board (§1.4)", () => {
    expect(game.board.width).toBe(39);
    expect(game.board.height).toBe(32);
    expect(game.board.cells).toHaveLength(39 * 32);
  });

  it("starts with blue to move (§2.7)", () => {
    expect(game.currentPlayer).toBe(CLASSIC_FIRST_PLAYER);
    expect(game.currentPlayer).toBe("blue");
  });

  it("starts with zero scores (§6.2.1)", () => {
    expect(game.scores).toEqual({ blue: 0, red: 0 });
  });

  it("places the official initial cross (§4.3)", () => {
    for (const { x, y, color } of CLASSIC_INITIAL_CROSS) {
      const cell = getCell(game.board, x, y);
      expect(cell.color, `${x}-${y}`).toBe(color);
      expect(cell.disabled, `${x}-${y}`).toBe(false);
    }

    // Explicit formal coordinates for review.
    expect(getCell(game.board, 20, 17).color).toBe("blue");
    expect(getCell(game.board, 21, 16).color).toBe("blue");
    expect(getCell(game.board, 20, 16).color).toBe("red");
    expect(getCell(game.board, 21, 17).color).toBe("red");
  });

  it("leaves all other intersections empty and enabled", () => {
    const occupied = new Set(
      CLASSIC_INITIAL_CROSS.map(({ x, y }) => toIndex(game.board, x, y)),
    );

    for (let i = 0; i < game.board.cells.length; i++) {
      const cell = game.board.cells[i]!;
      if (occupied.has(i)) {
        expect(cell.color).not.toBeNull();
        continue;
      }
      expect(cell.color).toBeNull();
      expect(cell.disabled).toBe(false);
    }
  });

  it("rejects non-classic board sizes", () => {
    expect(() =>
      initializeGame({ width: 38, height: 32, ruleset: "classic" }),
    ).toThrow(/39×32/);
    expect(() =>
      initializeGame({ width: 39, height: 31, ruleset: "classic" }),
    ).toThrow(/39×32/);
  });

  it("same-color dots form diagonals of one cell (§4.2)", () => {
    // Blue diagonal: 20-17 ↔ 21-16; red diagonal: 20-16 ↔ 21-17.
    expect(getCell(game.board, 20, 17).color).toBe(getCell(game.board, 21, 16).color);
    expect(getCell(game.board, 20, 16).color).toBe(getCell(game.board, 21, 17).color);
    expect(getCell(game.board, 20, 17).color).not.toBe(getCell(game.board, 20, 16).color);
  });
});
