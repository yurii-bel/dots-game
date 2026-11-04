import { resolveLandingCaptures } from "./enclosure/landing.js";
import { recalculateScore } from "./enclosure/recalculate-score.js";
import { winnerFromScores } from "./result.js";
import type {
  DeclareLandingResult,
  GameState,
  LandingError,
  LandingInput,
  PlayerColor,
} from "./types.js";

/**
 * Declare заземление / landing (§8.1г, §8.2–8.4).
 *
 * - Either seated player may declare (СКСТ does not require it to be their turn).
 * - Declaration is irrevocable (§8.3); the game finishes immediately.
 * - Surroundable declarer material is auto-captured by the opponent (§8.4).
 * - Winner follows §8.6 from the post-§8.4 score (resign/time stay out of engine).
 */
export function declareLanding(
  game: GameState,
  input: LandingInput,
): DeclareLandingResult {
  if (game.status !== "in_progress") {
    return fail({
      code: "GAME_NOT_IN_PROGRESS",
      message: "Game is not in progress; landing cannot be declared.",
    });
  }

  const declarer = colorForPlayer(game, input.playerId);
  if (!declarer) {
    return fail({
      code: "UNKNOWN_PLAYER",
      message: `Unknown playerId "${input.playerId}".`,
    });
  }

  const board = resolveLandingCaptures(game.board, declarer);
  const scores = recalculateScore(board);

  const next: GameState = {
    ...game,
    board,
    scores,
    status: "finished",
    finishedReason: "landing",
    winner: winnerFromScores(scores),
  };

  return { ok: true, game: next };
}

function colorForPlayer(game: GameState, playerId: string): PlayerColor | null {
  if (game.players.blue === playerId) return "blue";
  if (game.players.red === playerId) return "red";
  return null;
}

function fail(error: LandingError): DeclareLandingResult {
  return { ok: false, error };
}
