/** Product display name */
export const APP_NAME = "DOTS" as const;

/**
 * Classic Спортивные точки board size (СКСТ §1.4).
 * Shared reference for UI/server; authoritative size checks live in
 * `@dots/game-engine` `rules/classic`.
 */
export const DEFAULT_BOARD_WIDTH = 39 as const;
export const DEFAULT_BOARD_HEIGHT = 32 as const;
