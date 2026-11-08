/**
 * @dots/game-engine
 *
 * Pure Спортивные точки logic — no Socket.IO / Next.js / Prisma deps.
 * Rules patch: classic initializeGame + applyMove + declareLanding
 * (заземление §8.2–8.4; скрест documented as 8/4 dual).
 */

export const ENGINE_VERSION = "0.3.0-rules-patch" as const;

export type EngineCapabilities = {
  version: typeof ENGINE_VERSION;
  initializeGame: true;
  applyMove: true;
  declareLanding: true;
  message: string;
};

export function getEngineStatus(): EngineCapabilities {
  return {
    version: ENGINE_VERSION,
    initializeGame: true,
    applyMove: true,
    declareLanding: true,
    message:
      "initializeGame + applyMove + declareLanding (СКСТ 2017.1 заземление/скрест) ready.",
  };
}

export { initializeGame } from "./initialize-game";
export { applyMove } from "./apply-move";
export { declareLanding } from "./declare-landing";
export { winnerFromScores } from "./result";

export type {
  ApplyMoveFailure,
  ApplyMoveResult,
  ApplyMoveSuccess,
  Board,
  Cell,
  ClosedContour,
  ConnectedComponent,
  DeclareLandingFailure,
  DeclareLandingResult,
  DeclareLandingSuccess,
  EnclosedRegion,
  EnclosedRegionKind,
  FinishedReason,
  GamePlayers,
  GameState,
  GameStatus,
  InitializeGameOptions,
  LandingError,
  LandingErrorCode,
  LandingInput,
  MoveError,
  MoveErrorCode,
  MoveInput,
  PlayerColor,
  RulesetId,
} from "./types";

export {
  createEmptyBoard,
  placeDots,
  getCell,
  cloneBoard,
  toIndex,
  fromIndex,
  isInBounds,
  formatPoint,
} from "./board/index";
export type { Point, ColoredPoint } from "./board/index";

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
  findLandingCaptures,
  resolveLandingCaptures,
  findGroundedIndices,
  findSurroundableIndices,
  buildCapturedTerritoryContours,
  buildHalfCellRingsForIndices,
} from "./enclosure/index";
export type {
  CapturedTerritoryContour,
  FormalPoint,
} from "./enclosure/index";

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
} from "./rules/classic/index";
