import {
  assertClassicBoardSize,
  classicRuleset,
} from "./rules/classic/index.js";
import type { GameState, InitializeGameOptions } from "./types.js";

/**
 * Create a fresh game for the given ruleset.
 *
 * Classic: 39×32 board, official initial cross, blue to move, scores 0–0.
 */
export function initializeGame(options: InitializeGameOptions): GameState {
  const { width, height, ruleset } = options;

  assertClassicBoardSize(ruleset, width, height);

  return {
    ruleset: classicRuleset.id,
    rulesetVersion: classicRuleset.version,
    board: classicRuleset.createInitialBoard(),
    currentPlayer: classicRuleset.firstPlayer,
    scores: { blue: 0, red: 0 },
    moveNumber: 0,
    status: "in_progress",
  };
}
