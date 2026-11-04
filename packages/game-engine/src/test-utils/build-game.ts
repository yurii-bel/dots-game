import { createEmptyBoard, placeDots } from "../board/create-board.js";
import type { ColoredPoint } from "../board/create-board.js";
import {
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_RULESET_ID,
  CLASSIC_RULESET_VERSION,
} from "../rules/classic/constants.js";
import type { GameState, PlayerColor } from "../types.js";

/**
 * Build a classic-sized game from an explicit stone list (for capture fixtures).
 * Does not run enclosure resolution — callers place non-capturing setups, then
 * exercise `applyMove` for the closing stone.
 */
export function buildClassicGame(options: {
  dots: readonly ColoredPoint[];
  currentPlayer?: PlayerColor;
  moveNumber?: number;
  players?: { blue?: string; red?: string };
}): GameState {
  const empty = createEmptyBoard(CLASSIC_BOARD_WIDTH, CLASSIC_BOARD_HEIGHT);
  const board = placeDots(empty, options.dots);

  return {
    ruleset: CLASSIC_RULESET_ID,
    rulesetVersion: CLASSIC_RULESET_VERSION,
    board,
    currentPlayer: options.currentPlayer ?? "blue",
    players: {
      blue: options.players?.blue ?? "player-1",
      red: options.players?.red ?? "player-2",
    },
    scores: { blue: 0, red: 0 },
    moveNumber: options.moveNumber ?? 0,
    status: "in_progress",
  };
}

export function playerIdFor(game: GameState, color: PlayerColor): string {
  return game.players[color];
}
