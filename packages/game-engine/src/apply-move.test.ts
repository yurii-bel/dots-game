import { describe, expect, it } from "vitest";
import { applyMove, initializeGame } from "./index.js";

describe("applyMove (Milestone 2 stub)", () => {
  it("is not implemented yet", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    expect(() =>
      applyMove(game, { playerId: "player-1", x: 19, y: 16 }),
    ).toThrow(/not implemented/i);
  });
});

/**
 * Optional documentation of intended move-validation rules (СКСТ).
 * These tests intentionally fail-soft via `it.todo` — no implementation yet.
 *
 * Formal references: https://tensu.ru/rules/ §§2.4–2.9, 5.x
 */
describe("intended move validation (not implemented)", () => {
  it.todo("rejects moves when it is not the player's turn (§2.4)");
  it.todo("rejects occupied intersections (§2.9)");
  it.todo("rejects disabled (captured) intersections (§2.9 / §5.7)");
  it.todo("rejects out-of-bounds coordinates (§1.4)");
  it.todo("places exactly one dot and advances currentPlayer blue→red→blue");
  it.todo("does not allow undo (§2.6)");
});
