import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, getEngineStatus, initializeGame } from "./index.js";

describe("game-engine public surface", () => {
  it("reports M2 capabilities", () => {
    const status = getEngineStatus();
    expect(status.version).toBe(ENGINE_VERSION);
    expect(status.initializeGame).toBe(true);
    expect(status.applyMove).toBe(false);
  });

  it("exports initializeGame matching architecture guidance", () => {
    const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
    expect(game.board.width).toBe(39);
    expect(game.currentPlayer).toBe("blue");
  });
});
