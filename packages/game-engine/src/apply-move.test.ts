import { describe, expect, it } from "vitest";
import {
  applyMove,
  getCell,
  initializeGame,
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
} from "./index.js";
import { buildClassicGame, playerIdFor } from "./test-utils/build-game.js";

function fresh() {
  return initializeGame({
    width: CLASSIC_BOARD_WIDTH,
    height: CLASSIC_BOARD_HEIGHT,
    ruleset: "classic",
  });
}

describe("applyMove validation (СКСТ §§2.4–2.9)", () => {
  it("rejects moves when it is not the player's turn (§2.4)", () => {
    const game = fresh();
    const result = applyMove(game, { playerId: game.players.red, x: 19, y: 16 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_YOUR_TURN");
    }
  });

  it("rejects unknown player ids", () => {
    const game = fresh();
    const result = applyMove(game, { playerId: "spectator", x: 19, y: 16 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN_PLAYER");
    }
  });

  it("rejects occupied intersections (§2.9)", () => {
    const game = fresh();
    // Initial cross occupies 20-17 (blue).
    const result = applyMove(game, { playerId: game.players.blue, x: 20, y: 17 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OCCUPIED");
    }
  });

  it("rejects disabled (captured) intersections (§2.9 / §5.7)", () => {
    // Minimum capture setup; after blue closes, interior (10,10) is disabled.
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        { x: 10, y: 10, color: "red" },
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
        // missing south: 10-9 — blue will play there
      ],
    });
    const close = applyMove(game, { playerId: playerIdFor(game, "blue"), x: 10, y: 9 });
    expect(close.ok).toBe(true);
    if (!close.ok) return;

    expect(getCell(close.game.board, 10, 10).disabled).toBe(true);

    // Red to move; attempt to play on disabled interior.
    const rejected = applyMove(close.game, {
      playerId: playerIdFor(close.game, "red"),
      x: 10,
      y: 10,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe("DISABLED");
    }
  });

  it("rejects out-of-bounds coordinates (§1.4)", () => {
    const game = fresh();
    for (const [x, y] of [
      [0, 1],
      [1, 0],
      [40, 1],
      [1, 33],
      [19.5, 16],
    ] as const) {
      const result = applyMove(game, { playerId: game.players.blue, x, y });
      expect(result.ok, `${x}-${y}`).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("OUT_OF_BOUNDS");
      }
    }
  });

  it("places exactly one dot and advances currentPlayer blue→red→blue", () => {
    const game = fresh();
    const first = applyMove(game, { playerId: game.players.blue, x: 5, y: 5 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(getCell(first.game.board, 5, 5).color).toBe("blue");
    expect(first.game.currentPlayer).toBe("red");
    expect(first.game.moveNumber).toBe(1);
    // Prior state untouched (no undo surface; immutability).
    expect(getCell(game.board, 5, 5).color).toBeNull();
    expect(game.moveNumber).toBe(0);

    const second = applyMove(first.game, {
      playerId: first.game.players.red,
      x: 6,
      y: 5,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(getCell(second.game.board, 6, 5).color).toBe("red");
    expect(second.game.currentPlayer).toBe("blue");
    expect(second.game.moveNumber).toBe(2);
  });

  it("does not allow undo (§2.6) — no API reverses a committed move", () => {
    const game = fresh();
    const after = applyMove(game, { playerId: game.players.blue, x: 5, y: 5 });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    // Original snapshot remains the only handle on the prior position.
    expect(game.moveNumber).toBe(0);
    expect(after.game.moveNumber).toBe(1);
    expect(getCell(game.board, 5, 5).color).toBeNull();
  });

  it("rejects moves after the game is finished", () => {
    const game = fresh();
    const finished = { ...game, status: "finished" as const };
    const result = applyMove(finished, {
      playerId: game.players.blue,
      x: 5,
      y: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GAME_NOT_IN_PROGRESS");
    }
  });
});

describe("applyMove capture (СКСТ §5)", () => {
  it("captures the minimum four-around-one enclosure (§5.6)", () => {
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        { x: 10, y: 10, color: "red" },
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
      ],
    });

    const result = applyMove(game, {
      playerId: playerIdFor(game, "blue"),
      x: 10,
      y: 9,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const interior = getCell(result.game.board, 10, 10);
    expect(interior.color).toBe("red");
    expect(interior.disabled).toBe(true);
    expect(interior.capturedBy).toBe("blue");
    expect(result.game.scores.blue).toBe(1);
    expect(result.game.scores.red).toBe(0);

    // Chain stays active (§5.8).
    for (const [x, y] of [
      [10, 11],
      [9, 10],
      [11, 10],
      [10, 9],
    ] as const) {
      const chain = getCell(result.game.board, x, y);
      expect(chain.color).toBe("blue");
      expect(chain.disabled).toBe(false);
    }
  });

  it("does not capture an empty house — домик stays playable (§5.12–5.13)", () => {
    // Four blues around empty center — closing creates a house, not a capture.
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
      ],
    });

    const result = applyMove(game, {
      playerId: playerIdFor(game, "blue"),
      x: 10,
      y: 9,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const center = getCell(result.game.board, 10, 10);
    expect(center.color).toBeNull();
    expect(center.disabled).toBe(false);
    expect(result.game.scores.blue).toBe(0);

    // Opponent may still place inside the house.
    const enter = applyMove(result.game, {
      playerId: playerIdFor(result.game, "red"),
      x: 10,
      y: 10,
    });
    expect(enter.ok).toBe(true);
  });

  it("converts a house when the opponent places inside without escaping (§5.14)", () => {
    const game = buildClassicGame({
      currentPlayer: "red",
      dots: [
        // Blue house around (10,10)
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
        { x: 10, y: 9, color: "blue" },
      ],
    });

    const result = applyMove(game, {
      playerId: playerIdFor(game, "red"),
      x: 10,
      y: 10,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const trapped = getCell(result.game.board, 10, 10);
    expect(trapped.color).toBe("red");
    expect(trapped.disabled).toBe(true);
    expect(trapped.capturedBy).toBe("blue");
    expect(result.game.scores.blue).toBe(1);
    expect(result.game.scores.red).toBe(0);
  });

  it("lets a stone placed in a house escape by forming its own enclosure (§5.16)", () => {
    // Blue house around (5,5). Red builds three sides of a mini-capture around
    // a blue stone at (5,5) is wrong — need a blue point inside red's new chain.
    //
    // Setup: blue house at center empty (10,10). Nearby a lone blue at (12,10)
    // that red will enclose using a point inside the house... Actually §5.16:
    // the point in the house must close red's chain around some blue point(s),
    // including part of the former house.
    //
    // Simpler fixture: blue house around empty (10,10). Additional blue at (10,12)
    // outside. Red points ready so that playing (10,10) both enters the house and
    // completes a red cycle around blue (10,11) which is on the house boundary.
    //
    // Blue house walls: (10,11),(9,10),(11,10),(10,9). Blue (10,11) is a wall.
    // Red surrounds blue (10,11) with: (10,12), (9,11), (11,11), and closing (10,10)
    // which is inside the house (south of 10,11).
    const game = buildClassicGame({
      currentPlayer: "red",
      dots: [
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
        { x: 10, y: 9, color: "blue" },
        { x: 10, y: 12, color: "red" },
        { x: 9, y: 11, color: "red" },
        { x: 11, y: 11, color: "red" },
      ],
    });

    const result = applyMove(game, {
      playerId: playerIdFor(game, "red"),
      x: 10,
      y: 10,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Red's closing stone stays active (chain link), blue (10,11) captured by red.
    const closer = getCell(result.game.board, 10, 10);
    expect(closer.color).toBe("red");
    expect(closer.disabled).toBe(false);

    const captured = getCell(result.game.board, 10, 11);
    expect(captured.color).toBe("blue");
    expect(captured.disabled).toBe(true);
    expect(captured.capturedBy).toBe("red");
    expect(result.game.scores.red).toBeGreaterThanOrEqual(1);
    // Blue must not have scored the red stone via §5.14.
    expect(result.game.scores.blue).toBe(0);
  });

  it("supports nested / subsequent capture of an existing enclosure (§5.11 / §6.4)", () => {
    // First: blue captures red at (10,10) with the plus shape.
    const open = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        { x: 10, y: 10, color: "red" },
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
      ],
    });
    const afterBlue = applyMove(open, {
      playerId: playerIdFor(open, "blue"),
      x: 10,
      y: 9,
    });
    expect(afterBlue.ok).toBe(true);
    if (!afterBlue.ok) return;
    expect(afterBlue.game.scores.blue).toBe(1);

    // Red surrounds the entire blue enclosure (and its chain) with a larger ring,
    // leaving one gap to close. Outer ring around the blue plus:
    // Blues occupy: (10,11)(9,10)(11,10)(10,9); disabled red at (10,10).
    // Red ring (orthogonal diamond one step further), missing south closer.
    const withRing = buildClassicGame({
      currentPlayer: "red",
      moveNumber: afterBlue.game.moveNumber,
      dots: [
        { x: 10, y: 10, color: "red" },
        { x: 10, y: 11, color: "blue" },
        { x: 9, y: 10, color: "blue" },
        { x: 11, y: 10, color: "blue" },
        { x: 10, y: 9, color: "blue" },
        // Red outer ring
        { x: 10, y: 12, color: "red" },
        { x: 9, y: 11, color: "red" },
        { x: 11, y: 11, color: "red" },
        { x: 8, y: 10, color: "red" },
        { x: 12, y: 10, color: "red" },
        { x: 9, y: 9, color: "red" },
        { x: 11, y: 9, color: "red" },
        // missing (10,8) to close
      ],
    });
    // Replay blue's capture onto this board so disabled/capturedBy match.
    // Simpler: mutate from afterBlue by placing red ring stones via applyMove —
    // but turn order fights us. Manually mark the already-captured interior:
    withRing.board.cells; // keep reference
    const board = withRing.board;
    const interiorIdx =
      (10 - 1) * board.width + (10 - 1);
    board.cells[interiorIdx] = {
      color: "red",
      disabled: true,
      capturedBy: "blue",
    };
    withRing.scores = { blue: 1, red: 0 };

    const nested = applyMove(withRing, {
      playerId: playerIdFor(withRing, "red"),
      x: 10,
      y: 8,
    });
    expect(nested.ok).toBe(true);
    if (!nested.ok) return;

    // Blue chain points should now be disabled under red ownership.
    for (const [x, y] of [
      [10, 11],
      [9, 10],
      [11, 10],
      [10, 9],
    ] as const) {
      const cell = getCell(nested.game.board, x, y);
      expect(cell.disabled, `${x}-${y}`).toBe(true);
      expect(cell.capturedBy, `${x}-${y}`).toBe("red");
    }
    // §6.4 — blue loses the prior point; red scores blue stones now enclosed.
    expect(nested.game.scores.blue).toBe(0);
    expect(nested.game.scores.red).toBeGreaterThanOrEqual(4);
  });

  it("keeps empty lobes as houses when a chord yields min-area capture (§5.10)", () => {
    // Figure-8-ish: two lobes sharing a blue chord. Left lobe has red; right is empty.
    // Blues: outer cycle with chord at x=10.
    // Left interior (9,10) has red; right interior (11,10) empty.
    //
    //   b b b b b
    //   b r b . b
    //   b b b b b
    //
    // Closing the last gap should capture only the red lobe; empty lobe stays house.
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        // bottom row y=9
        { x: 8, y: 9, color: "blue" },
        { x: 9, y: 9, color: "blue" },
        { x: 10, y: 9, color: "blue" },
        { x: 11, y: 9, color: "blue" },
        { x: 12, y: 9, color: "blue" },
        // middle
        { x: 8, y: 10, color: "blue" },
        { x: 9, y: 10, color: "red" },
        { x: 10, y: 10, color: "blue" }, // chord
        // (11,10) empty — house lobe
        { x: 12, y: 10, color: "blue" },
        // top y=11 (missing one to close — play 9,11)
        { x: 8, y: 11, color: "blue" },
        { x: 10, y: 11, color: "blue" },
        { x: 11, y: 11, color: "blue" },
        { x: 12, y: 11, color: "blue" },
      ],
    });

    const result = applyMove(game, {
      playerId: playerIdFor(game, "blue"),
      x: 9,
      y: 11,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(getCell(result.game.board, 9, 10).disabled).toBe(true);
    expect(getCell(result.game.board, 9, 10).capturedBy).toBe("blue");
    // Empty lobe remains playable (house).
    expect(getCell(result.game.board, 11, 10).disabled).toBe(false);
    expect(getCell(result.game.board, 11, 10).color).toBeNull();
    expect(result.game.scores.blue).toBe(1);
  });
});
