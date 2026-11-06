import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  getEngineStatus,
  initializeGame,
  applyMove,
  declareLanding,
} from "./index";

describe("game-engine public surface", () => {
  it("reports rules-patch capabilities", () => {
    const status = getEngineStatus();
    expect(status.version).toBe(ENGINE_VERSION);
    expect(status.initializeGame).toBe(true);
    expect(status.applyMove).toBe(true);
    expect(status.declareLanding).toBe(true);
  });

  it("exports initializeGame matching architecture guidance", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    expect(game.board.width).toBe(39);
    expect(game.currentPlayer).toBe("blue");
    expect(game.players).toEqual({ blue: "player-1", red: "player-2" });
    expect(game.winner).toBeNull();
    expect(game.finishedReason).toBeNull();
  });

  it("applyMove returns a result object (success/error)", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    const ok = applyMove(game, { playerId: "player-1", x: 5, y: 5 });
    expect(ok.ok).toBe(true);

    const bad = applyMove(game, { playerId: "player-2", x: 5, y: 5 });
    expect(bad.ok).toBe(false);
  });

  it("declareLanding finishes the game under §8.1г", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    const result = declareLanding(game, { playerId: game.players.blue });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.status).toBe("finished");
    expect(result.game.finishedReason).toBe("landing");
  });
});
