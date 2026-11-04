/**
 * @dots/game-engine
 *
 * Pure Спортивные точки logic — no Socket.IO / Next.js / Prisma deps.
 * Milestone 3: classic initializeGame + applyMove (validation, enclosure, capture).
 */

export const ENGINE_VERSION = "0.2.0-m3" as const;

export type EngineCapabilities = {
  version: typeof ENGINE_VERSION;
  initializeGame: true;
  applyMove: true;
  message: string;
};

export function getEngineStatus(): EngineCapabilities {
  return {
    version: ENGINE_VERSION,
    initializeGame: true,
    applyMove: true,
    message:
      "initializeGame + applyMove (classic СКСТ 2017.1 validation/enclosure/capture) ready.",
  };
}

export { initializeGame } from "./initialize-game.js";
export { applyMove } from "./apply-move.js";

export type {
  ApplyMoveFailure,
  ApplyMoveResult,
  ApplyMoveSuccess,
  Board,
  Cell,
  ClosedContour,
  ConnectedComponent,
  EnclosedRegion,
  EnclosedRegionKind,
  GamePlayers,
  GameState,
  GameStatus,
  InitializeGameOptions,
  MoveError,
  MoveErrorCode,
  MoveInput,
  PlayerColor,
  RulesetId,
} from "./types.js";

export {
  createEmptyBoard,
  placeDots,
  getCell,
  cloneBoard,
  toIndex,
  fromIndex,
  isInBounds,
  formatPoint,
} from "./board/index.js";
export type { Point, ColoredPoint } from "./board/index.js";

export {
  findConnectedComponents,
  findExteriorMask,
  findClosedContours,
  findEnclosedRegions,
  validateEnclosure,
  findValidCaptures,
  findHouses,
  resolveCapture,
  recalculateScore,
} from "./enclosure/index.js";

export {
  classicRuleset,
  createClassicInitialBoard,
  classicOpponent,
  CLASSIC_BOARD_WIDTH,
  CLASSIC_BOARD_HEIGHT,
  CLASSIC_FIRST_PLAYER,
  CLASSIC_INITIAL_CROSS,
  CLASSIC_RULESET_ID,
  CLASSIC_RULESET_VERSION,
} from "./rules/classic/index.js";
