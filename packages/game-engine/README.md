# `@dots/game-engine`

Pure TypeScript Спортивные точки (Sports Dots) logic. No Socket.IO, Next.js, or Prisma.

## Milestone 3 status

| API | Status |
| --- | --- |
| `initializeGame({ width, height, ruleset, players? })` | Implemented for `classic` |
| `applyMove(game, move)` | Implemented — validation + enclosure/capture |

```ts
import { initializeGame, applyMove } from "@dots/game-engine";

const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
// game.players === { blue: "player-1", red: "player-2" }

const result = applyMove(game, { playerId: "player-1", x: 20, y: 18 });
if (result.ok) {
  // result.game — new immutable state
} else {
  // result.error.code — NOT_YOUR_TURN | OCCUPIED | DISABLED | OUT_OF_BOUNDS | …
}
```

## Classic rules (СКСТ 2017.1)

**Primary source:** [СКСТ formal rules](https://tensu.ru/rules/) — order №2 of 27 January 2017 (tensu.ru).

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
| Four-cross start | §4.4 | **Deferred** (rematch-only) |

`rulesetVersion` remains `"2017.1"`.

## Enclosure pipeline

```
findConnectedComponents → findEnclosedRegions / findClosedContours
  → validateEnclosure → resolveCapture → recalculateScore
```

Dual connectivity: 8-connected chains (§5.2), 4-connected region flood from the border.

## Layout

```
src/
  board/              # grid helpers
  enclosure/          # capture pipeline
  rules/classic/      # versioned classic ruleset
  initialize-game.ts
  apply-move.ts
  types.ts
  index.ts
```
