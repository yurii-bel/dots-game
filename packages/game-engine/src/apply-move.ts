import { cloneBoard } from "./board/create-board.js";
import { isInBounds, toIndex } from "./board/coords.js";
import {
  findValidCaptures,
  recalculateScore,
  resolveCapture,
} from "./enclosure/index.js";
import { winnerFromScores } from "./result.js";
import { classicOpponent } from "./rules/classic/index.js";
import type {
  ApplyMoveResult,
  Board,
  GameState,
  MoveError,
  MoveInput,
  PlayerColor,
} from "./types.js";

/**
 * Apply a move under the classic СКСТ ruleset.
 *
 * Returns `{ ok: true, game }` or `{ ok: false, error }` — never throws for
 * rule violations. Mutates no inputs (returns a new state on success).
 *
 * Pipeline after a legal placement:
 * 1. Resolve captures for the mover (§5.5–5.7, §5.10–5.11, §5.16)
 * 2. If the placed point still sits in an opponent домик, convert that house
 *    into an opponent capture (§5.14)
 * 3. Recalculate scores (§6.1 / §6.4)
 * 4. If no playable empties remain, finish (§8.1в) with §8.6 winner
 */
export function applyMove(game: GameState, move: MoveInput): ApplyMoveResult {
  const turnError = validateTurn(game, move);
  if (turnError) return fail(turnError);

  const placementError = validatePlacement(game.board, move.x, move.y);
  if (placementError) return fail(placementError);

  const player = game.currentPlayer;
  const opponent = classicOpponent(player);
  const moveIndex = toIndex(game.board, move.x, move.y);

  let board = placeStone(game.board, moveIndex, player);

  // §5.16 first: mover's own enclosures (including through an opponent house).
  const moverCaptures = findValidCaptures(board, player);
  board = resolveCapture(board, moverCaptures);

  // §5.14: point left inside an opponent house is surrounded on turn pass.
  board = maybeResolveHouseEntry(board, moveIndex, player, opponent);

  const scores = recalculateScore(board);
  const moveNumber = game.moveNumber + 1;
  const boardFull = !hasPlayableEmpty(board);
  const nextPlayer = opponent;

  const next: GameState = {
    ...game,
    board,
    currentPlayer: boardFull ? player : nextPlayer,
    scores,
    moveNumber,
    status: boardFull ? "finished" : "in_progress",
    finishedReason: boardFull ? "board_full" : null,
    winner: boardFull ? winnerFromScores(scores) : null,
  };

  return { ok: true, game: next };
}

function validateTurn(game: GameState, move: MoveInput): MoveError | null {
  if (game.status !== "in_progress") {
    return {
      code: "GAME_NOT_IN_PROGRESS",
      message: "Game is not in progress; moves are not accepted.",
    };
  }

  const knownIds = new Set(Object.values(game.players));
  if (!knownIds.has(move.playerId)) {
    return {
      code: "UNKNOWN_PLAYER",
      message: `Unknown playerId "${move.playerId}".`,
    };
  }

  const expectedId = game.players[game.currentPlayer];
  if (move.playerId !== expectedId) {
    return {
      code: "NOT_YOUR_TURN",
      message: `It is ${game.currentPlayer}'s turn (${expectedId}), not "${move.playerId}".`,
    };
  }

  return null;
}

function validatePlacement(board: Board, x: number, y: number): MoveError | null {
  if (!isInBounds(board, x, y)) {
    return {
      code: "OUT_OF_BOUNDS",
      message: `Coordinate (${x}-${y}) is outside the ${board.width}×${board.height} board.`,
    };
  }

  const cell = board.cells[toIndex(board, x, y)]!;
  if (cell.disabled) {
    return {
      code: "DISABLED",
      message: `Intersection (${x}-${y}) is disabled (captured) and cannot be played (§2.9 / §5.7).`,
    };
  }
  if (cell.color !== null) {
    return {
      code: "OCCUPIED",
      message: `Intersection (${x}-${y}) is already occupied (§2.9).`,
    };
  }

  return null;
}

function placeStone(board: Board, index: number, color: PlayerColor): Board {
  const next = cloneBoard(board);
  next.cells[index] = { color, disabled: false, capturedBy: null };
  return next;
}

/**
 * §5.14 / §5.16 — after the mover's captures resolve, if the placed stone is
 * still active and now seals an opponent capture interior (former домик), the
 * opponent enclosure is resolved on turn pass without a separate opponent move.
 *
 * Once a stone sits inside opponent walls, `findValidCaptures(opponent)` sees a
 * capture (not a house) — that is the §5.14 conversion. §5.16 is already handled
 * when the mover's own capture claimed boundary ownership of the stone.
 */
function maybeResolveHouseEntry(
  board: Board,
  moveIndex: number,
  player: PlayerColor,
  opponent: PlayerColor,
): Board {
  const cell = board.cells[moveIndex];
  if (!cell || cell.disabled || cell.color !== player) {
    // Already disabled as interior of mover's own capture, or otherwise gone.
    return board;
  }

  const opponentCaptures = findValidCaptures(board, opponent).filter((region) =>
    region.interior.includes(moveIndex),
  );

  if (opponentCaptures.length === 0) return board;
  return resolveCapture(board, opponentCaptures);
}

function hasPlayableEmpty(board: Board): boolean {
  return board.cells.some((cell) => cell.color === null && !cell.disabled);
}

function fail(error: MoveError): ApplyMoveResult {
  return { ok: false, error };
}
