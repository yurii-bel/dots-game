import {
  assertClassicBoardSize,
  classicRuleset,
} from "./rules/classic/index.js";
import type { GamePlayers, GameState, InitializeGameOptions } from "./types.js";

const DEFAULT_PLAYERS: GamePlayers = {
  blue: "player-1",
  red: "player-2",
};

/**
 * Create a fresh game for the given ruleset.
 *
 * Classic: 39×32 board, official initial cross, blue to move, scores 0–0.
 */
export function initializeGame(options: InitializeGameOptions): GameState {
  const { width, height, ruleset } = options;

  assertClassicBoardSize(ruleset, width, height);

  const players: GamePlayers = {
    blue: options.players?.blue ?? DEFAULT_PLAYERS.blue,
    red: options.players?.red ?? DEFAULT_PLAYERS.red,
  };

  if (players.blue === players.red) {
    throw new Error("Blue and red player ids must be distinct");
  }

  return {
    ruleset: classicRuleset.id,
    rulesetVersion: classicRuleset.version,
    board: classicRuleset.createInitialBoard(),
    currentPlayer: classicRuleset.firstPlayer,
    players,
    scores: { blue: 0, red: 0 },
    moveNumber: 0,
    status: "in_progress",
    winner: null,
    finishedReason: null,
  };
}
