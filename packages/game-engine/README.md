# `@dots/game-engine`

Pure TypeScript Спортивные точки (Sports Dots) logic. No Socket.IO, Next.js, or Prisma.

## Status (rules patch)

| API | Status |
| --- | --- |
| `initializeGame({ width, height, ruleset, players? })` | Implemented for `classic` |
| `applyMove(game, move)` | Validation + enclosure/capture; board-full finish (§8.1в / §8.6) |
| `declareLanding(game, { playerId })` | Заземление §8.2–8.4 |

```ts
import { initializeGame, applyMove, declareLanding } from "@dots/game-engine";

const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
// game.players === { blue: "player-1", red: "player-2" }

const placed = applyMove(game, { playerId: "player-1", x: 20, y: 18 });
const landed = declareLanding(placed.ok ? placed.game : game, { playerId: "player-1" });
```

`GameState` additive fields (backward compatible): `winner`, `finishedReason` (`board_full` | `landing` | `null`).

## Classic rules (СКСТ 2017.1)

**Primary source:** [СКСТ formal rules](https://tensu.ru/rules/) — order №2 of 27 January 2017 (tensu.ru).  
**Terminology:** [tensu.ru/terminology](https://tensu.ru/terminology/) (§3.7–3.12 скрест, §6.67–6.69 заземление).

| Topic | Formal rule | Engine choice |
| --- | --- | --- |
| Board size | §1.4 — 39 × 32 | Rejected other sizes for `classic` |
| Coordinates | §1.3 / §2.10 — 1-based, Y-up | Formal coords in the public API |
| Initial cross | §4.3 | Exact coords in `rules/classic/constants.ts` |
| Turns / undo | §2.4–2.6 | Alternating; no undo API |
| Placement | §2.9 | Reject occupied / disabled |
| Enclosure chain | §5.2 — 8-adjacent | Walls = active same-color points |
| Capture vs домик | §5.5 / §5.12 | Opponent inside → capture; empty → house |
| Min area | §5.10 | Interior components separated by chords |
| House entry | §5.14 / §5.16 | Auto-capture on turn pass; own enclosure escapes |
| Scoring | §6.1 / §6.4 | `recalculateScore` from `capturedBy` |
| Заземление | §8.2–8.4 | `declareLanding` + perfect-fill surroundability |
| Result | §8.6 | `winner` from final scores |
| Four-cross start | §4.4 | **Deferred** (rematch-only) |
| Resign / time / draw | §8.1а,б,д | **Server/UI** (not pure engine) |

`rulesetVersion` remains `"2017.1"`. `ENGINE_VERSION` is `0.3.0-rules-patch`.

## Заземление interpretation (§8.2–8.4)

Surroundable under §8.4 means: if every empty playable intersection were filled with an active opponent stone, the declarer's material would lie in a valid opponent capture interior under the 8-wall / 4-flood dual.

- Orthogonal walls pressed to the border → grounded (unsurroundable).
- Diagonal-only attachment to the border → still surroundable (стенка required; Priymak training).
- Either seated player may declare (not required to be side-to-move); declaration finishes the game once (§8.3).
- Auto-capture of surroundable material (§8.4); no “opponent free moves” variant (Wikipedia informal).

**Ambiguity for Yurii:** terminology §6.69 “strategic landing” (unsurroundable without a full border wall) is not credited as grounded by the perfect-fill test.

## Скрест interpretation (terminology §3.8 / §3.12)

A скрест is two crossing diagonal links of different colors (mutual control). Diagonal links are *passable* and may intersect. The existing 8-wall / 4-flood dual already matches this — both colors keep their diagonal chain; orthogonal flood cannot slip through. No extra graph rule was added. Fixtures live in `enclosure/skrest.test.ts`.

## Enclosure pipeline

```
findConnectedComponents → findEnclosedRegions / findClosedContours
  → validateEnclosure → resolveCapture → recalculateScore
```

Landing: `findLandingCaptures` → `resolveLandingCaptures` → `recalculateScore` → §8.6 winner.

Geometry-only (no rules): `buildCapturedTerritoryContours` / `buildHalfCellRingsForIndices` — half-cell perimeters from `capturedBy` for web R1 hybrid fallback when live capturer walls are missing after §8.4.

## Layout

```
src/
  board/              # grid helpers
  enclosure/          # capture + landing + скрест fixtures
  rules/classic/      # versioned classic ruleset
  initialize-game.ts
  apply-move.ts
  declare-landing.ts
  result.ts
  types.ts
  index.ts
```
