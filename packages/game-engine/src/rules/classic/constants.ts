/**
 * Classic Спортивные точки (СКСТ formal rules, order №2 of 27 Jan 2017).
 *
 * Source: https://tensu.ru/rules/ (retrieved for Milestone 2).
 *
 * Coordinate system (§1.3, §2.10):
 * - 1-based Arabic numerals
 * - X: left → right
 * - Y: bottom → top
 * - Move notation: "X-Y" (e.g. "20-17")
 */

export const CLASSIC_RULESET_ID = "classic" as const;

/** Bump when classic capture/scoring semantics change. */
export const CLASSIC_RULESET_VERSION = "2017.1" as const;

/** §1.4 — 39 intersections horizontally, 32 vertically. */
export const CLASSIC_BOARD_WIDTH = 39 as const;
export const CLASSIC_BOARD_HEIGHT = 32 as const;

/**
 * §4.3 — начальный скрест (initial cross).
 *
 * Blue (синие): 20-17, 21-16
 * Red  (красные): 20-16, 21-17
 *
 * Same-color dots sit on opposite corners of one cell (imaginary diagonal).
 */
export const CLASSIC_INITIAL_CROSS = [
  { x: 20, y: 17, color: "blue" },
  { x: 21, y: 16, color: "blue" },
  { x: 20, y: 16, color: "red" },
  { x: 21, y: 17, color: "red" },
] as const;

/** §2.7 — first move belongs to blue. */
export const CLASSIC_FIRST_PLAYER = "blue" as const;
