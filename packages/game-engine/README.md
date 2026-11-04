# `@dots/game-engine`

Pure TypeScript Спортивные точки (Sports Dots) logic. No Socket.IO, Next.js, or Prisma.

## Milestone 2 status

| API | Status |
| --- | --- |
| `initializeGame({ width, height, ruleset })` | Implemented for `classic` |
| `applyMove(game, move)` | Stub — throws until move-validation milestone |

```ts
import { initializeGame } from "@dots/game-engine";

const game = initializeGame({ width: 39, height: 32, ruleset: "classic" });
// game.currentPlayer === "blue"
// official initial cross placed; scores 0–0
```

## Classic rules analysis (init scope)

**Primary source:** [СКСТ formal rules](https://tensu.ru/rules/) — approved by RОО “СКСТ” order №2 of 27 January 2017 (tensu.ru).  
**Supporting:** [terminology](https://tensu.ru/terminology/), [four-cross rematch note](https://tensu.ru/post-2-2019/).

| Topic | Formal rule | Engine choice |
| --- | --- | --- |
| Board size | §1.4 — 39 × 32 intersections | `CLASSIC_BOARD_WIDTH/HEIGHT`; `initializeGame` rejects other sizes for `classic` |
| Coordinates | §1.3 / §2.10 — 1-based; X left→right; **Y bottom→top**; notation `X-Y` | Public API uses the same formal 1-based system |
| Initial cross | §4.3 — blue `20-17`, `21-16`; red `20-16`, `21-17` | Exact coords in `rules/classic/constants.ts` |
| First player | §2.7 — blue | `currentPlayer: "blue"` |
| Starting score | §6.2.1 — always 0 | `scores: { blue: 0, red: 0 }` |
| Four-cross start | §4.4 — rematch-only; coords set by organizers | **Not** implemented (open for later) |

### Chosen initial-cross coordinates

```
Blue: (20, 17), (21, 16)
Red:  (20, 16), (21, 17)
```

Same-color points lie on opposite corners of one cell (imaginary diagonal), matching §4.2.

### Open questions for Yurii

1. Confirm tensu.ru / СКСТ 2017 as the authoritative text (vs. another federation PDF).
2. Confirm engine storage keeps **formal Y-up** (recommended) vs. converting to canvas Y-down at the UI boundary only.
3. Four-cross rematch preset: defer until tournament/rematch work?
4. `rulesetVersion: "2017.1"` naming — OK, or prefer a different scheme?
5. Proceed to `applyMove` validation + enclosure/capture (graph flood-fill plan in architecture guidance)?

## Layout

```
src/
  board/           # grid helpers, empty board, accessors
  rules/classic/   # versioned classic ruleset (size, cross, first player)
  initialize-game.ts
  apply-move.ts    # stub
  types.ts
  index.ts
```

Capture pipeline (`findClosedContours`, `resolveCapture`, …) is intentionally absent until approved.
