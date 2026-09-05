# RESOLVED — 2026-07-12 Visuals & Gameplay Enhancement

Status: All 10 objectives shipped in live tree (verified empirically).
Date resolved: 2026-09-05 (surgical-implementation skill run).
Resolver note: Plan doc status ([ ] checkboxes) was stale; code was
already merged before this plan was authored as a retrospective spec.
Each objective maps to existing files + tests:

| Obj | File(s) | Test file |
|-----|---------|-----------|
| A1  | src/enemies/enemyStep.ts | src/enemies/enemyStep.test.ts |
| A2  | src/game/projectile.ts | src/game/projectile.test.ts |
| A3  | src/game/player.ts (lives, invulnUntil, gameOver) | src/game/player.test.ts |
| A4  | src/game/scoring.ts (combo) | src/game/scoring.test.ts |
| B1  | src/scenes/GameScene.ts (advanceGameStateWithDiagnostics) | src/scenes/GameScene.test.ts |
| C1-C3 | src/render/RevealMask.ts + GameScene | ReMask.test.ts + GameScene.test.ts |
| C4  | src/scenes/HudFeedback.ts | src/scenes/HudFeedback.test.ts |
| C5  | src/scenes/GameScene.ts (win/lose overlays) | src/scenes/GameScene.test.ts |

Companion doc: 2026-07-12-enhance-visuals-gameplay-design.md retained
as design context.
