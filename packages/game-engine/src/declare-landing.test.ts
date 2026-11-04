import { describe, expect, it } from "vitest";
import {
  declareLanding,
  findGroundedIndices,
  findSurroundableIndices,
  getCell,
  toIndex,
} from "./index.js";
import { buildClassicGame, playerIdFor } from "./test-utils/build-game.js";

describe("declareLanding (§8.2–8.4)", () => {
  it("rejects landing when the game is finished", () => {
    const game = buildClassicGame({ dots: [] });
    const finished = { ...game, status: "finished" as const, finishedReason: "board_full" as const };
    const result = declareLanding(finished, { playerId: game.players.blue });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("GAME_NOT_IN_PROGRESS");
  });

  it("rejects unknown player ids", () => {
    const game = buildClassicGame({ dots: [] });
    const result = declareLanding(game, { playerId: "spectator" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNKNOWN_PLAYER");
  });

  it("allows declaration off-turn (СКСТ does not require side-to-move)", () => {
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        // Red orthogonal wall pressed to the bottom edge — grounded.
        { x: 5, y: 1, color: "red" },
        { x: 6, y: 1, color: "red" },
        { x: 7, y: 1, color: "red" },
      ],
    });

    const result = declareLanding(game, { playerId: playerIdFor(game, "red") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.status).toBe("finished");
    expect(result.game.finishedReason).toBe("landing");
  });

  it("treats an orthogonal wall pressed to the border as grounded", () => {
    const game = buildClassicGame({
      currentPlayer: "blue",
      dots: [
        { x: 10, y: 1, color: "blue" },
        { x: 11, y: 1, color: "blue" },
        { x: 12, y: 1, color: "blue" },
        { x: 10, y: 2, color: "blue" },
        { x: 11, y: 2, color: "blue" },
        { x: 12, y: 2, color: "blue" },
      ],
    });

    const grounded = new Set(findGroundedIndices(game.board, "blue"));
    for (const [x, y] of [
      [10, 1],
      [11, 1],
      [12, 1],
      [10, 2],
      [11, 2],
      [12, 2],
    ] as const) {
      expect(grounded.has(toIndex(game.board, x, y)), `${x}-${y}`).toBe(true);
    }
    expect(findSurroundableIndices(game.board, "blue")).toHaveLength(0);

    const result = declareLanding(game, { playerId: playerIdFor(game, "blue") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.scores).toEqual({ blue: 0, red: 0 });
    expect(result.game.winner).toBeNull();
    expect(result.game.finishedReason).toBe("landing");
  });

  it("awards surroundable interior stones to the opponent (§8.4)", () => {
    // Blue: grounded edge capture (keeps 1 point) + lone mid-board stone (lost).
    const game = buildClassicGame({
      currentPlayer: "red",
      dots: [
        // Plus capture pressed to the bottom edge around (3,2).
        { x: 3, y: 2, color: "red" },
        { x: 3, y: 3, color: "blue" },
        { x: 2, y: 2, color: "blue" },
        { x: 4, y: 2, color: "blue" },
        { x: 3, y: 1, color: "blue" }, // border link
        // Surroundable lone stone.
        { x: 20, y: 16, color: "blue" },
      ],
    });
    const capturedIdx = toIndex(game.board, 3, 2);
    game.board.cells[capturedIdx] = {
      color: "red",
      disabled: true,
      capturedBy: "blue",
    };
    game.scores = { blue: 1, red: 0 };

    expect(findSurroundableIndices(game.board, "blue")).toContain(
      toIndex(game.board, 20, 16),
    );
    expect(findGroundedIndices(game.board, "blue")).toContain(
      toIndex(game.board, 3, 1),
    );

    const result = declareLanding(game, { playerId: playerIdFor(game, "blue") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const trapped = getCell(result.game.board, 20, 16);
    expect(trapped.disabled).toBe(true);
    expect(trapped.capturedBy).toBe("red");

    // Edge capture stays blue's point; chain remains active.
    expect(getCell(result.game.board, 3, 2).capturedBy).toBe("blue");
    expect(getCell(result.game.board, 3, 1).disabled).toBe(false);
    expect(result.game.scores.blue).toBe(1);
    expect(result.game.scores.red).toBe(1);
    expect(result.game.winner).toBeNull(); // §8.6 draw
    expect(result.game.finishedReason).toBe("landing");
  });

  it("does not treat diagonal-only attachment to the border as grounded (стенка required)", () => {
    // Blue (1,1) on the corner + blue (2,2) only diagonally linked — training
    // figure: branch attached but not yet a wall.
    const game = buildClassicGame({
      dots: [
        { x: 1, y: 1, color: "blue" },
        { x: 2, y: 2, color: "blue" },
        { x: 3, y: 3, color: "blue" },
      ],
    });

    const grounded = new Set(findGroundedIndices(game.board, "blue"));
    expect(grounded.has(toIndex(game.board, 1, 1))).toBe(true);
    expect(grounded.has(toIndex(game.board, 2, 2))).toBe(false);
    expect(grounded.has(toIndex(game.board, 3, 3))).toBe(false);

    const result = declareLanding(game, { playerId: playerIdFor(game, "blue") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getCell(result.game.board, 2, 2).capturedBy).toBe("red");
    expect(getCell(result.game.board, 3, 3).capturedBy).toBe("red");
    expect(getCell(result.game.board, 1, 1).disabled).toBe(false);
  });
});
