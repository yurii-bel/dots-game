import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, getEngineStatus, initializeGame, applyMove } from "./index.js";

describe("game-engine public surface", () => {
  it("reports M3 capabilities", () => {
    const status = getEngineStatus();
    expect(status.version).toBe(ENGINE_VERSION);
    expect(status.initializeGame).toBe(true);
    expect(status.applyMove).toBe(true);
  });

  it("exports initializeGame matching architecture guidance", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    expect(game.board.width).toBe(39);
    expect(game.currentPlayer).toBe("blue");
    expect(game.players).toEqual({ blue: "player-1", red: "player-2" });
  });

  it("applyMove returns a result object (success/error)", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    const ok = applyMove(game, { playerId: "player-1", x: 5, y: 5 });
    expect(ok.ok).toBe(true);

    const bad = applyMove(game, { playerId: "player-2", x: 5, y: 5 });
    expect(bad.ok).toBe(false);
  });
});
