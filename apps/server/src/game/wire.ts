import type { GameState, PlayerColor } from "@dots/game-engine";
import type { WireGameState } from "@dots/shared";

export function toWireState(
  gameId: string,
  game: GameState,
  winner: PlayerColor | null = null,
): WireGameState {
  return {
    gameId,
    ruleset: game.ruleset,
    rulesetVersion: game.rulesetVersion,
    board: {
      width: game.board.width,
      height: game.board.height,
      cells: game.board.cells.map((cell) => ({
        color: cell.color,
        disabled: cell.disabled,
        capturedBy: cell.capturedBy,
      })),
    },
    currentPlayer: game.currentPlayer,
    players: { ...game.players },
    scores: { ...game.scores },
    version: game.moveNumber,
    status: game.status,
    winner,
  };
}
