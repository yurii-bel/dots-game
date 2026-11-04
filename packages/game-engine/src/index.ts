/**
 * @dots/game-engine
 *
 * Milestone 1 stub only. Classic Спортивные точки rules, board, capture,
 * and multiplayer logic intentionally live here later — not yet implemented.
 */

export const ENGINE_VERSION = "0.0.0-stub" as const;

export type EngineStatus = {
  version: typeof ENGINE_VERSION;
  ready: false;
  message: string;
};

export function getEngineStatus(): EngineStatus {
  return {
    version: ENGINE_VERSION,
    ready: false,
    message: "Game engine scaffold only — rules not implemented yet.",
  };
}
