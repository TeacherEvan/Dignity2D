# Dignity2D — Visuals & Gameplay Enhancement (Design)

Date: 2026-07-12
Direction: **Deepen existing Golden Cyberpunk Egyptian** theme.

## Goal

Drastically improve (a) visual polish and (b) gameplay depth while preserving the
project's core architecture: pure, framework-free, deterministic gameplay modules
under `src/game`, `src/enemies`, `src/render`, with `GameScene` as a thin Phaser
presentation layer. Mobile-web portrait is the primary target.

## Current gaps (verified)

- Visuals: flat rectangles + bare circles, single-color trail/capture lines, no
  background, no glow, no win/lose feedback beyond HUD text.
- Gameplay: enemies only bounce off walls (`EnemyIntent` system in
  `EnemyBehavior.ts` is unused); `ProjectileState`/`projectiles` typed but never
  spawned; `PlayerState.health` set but never read (lives/game-over dead code).

## Visual plan (Golden Cyberpunk Egyptian, deepened)

1. **Background**: static scanline grid + radial vignette, pre-rendered to a
   RenderTexture ONCE (no per-frame redraw) + one cheap animated sweep line.
2. **Neon glow orbs**: player + enemies rendered as layered concentric circles
   (wide low-alpha glow + bright core) so it works without `preFX`. WebGL `preFX`
   glow used when available, with the layered fallback for reduced-motion/low-end.
3. **Per-kind enemy glyphs**: chaser=triangle, shooter=diamond, orbiter=ring,
   disruptor=cross; each in its category color.
4. **Trail**: layered glow stroke (wide faint + thin bright) with a pulsing
   leading edge.
5. **Capture shimmer**: fill + animated overlaid highlight stroke (alpha tween).
6. **HUD**: lives indicator (glyphs), combo meter, category-colored enemy count
   tags, stronger neon seal accents (reuse existing chamfered panels).
7. **Win/Lose overlays**: animated "IMAGE SECURED" victory burst and
   "SIGNAL LOST" defeat overlay with retry prompt.

## Gameplay plan

1. **Per-kind enemy AI** (pure `stepEnemies` in `src/enemies/enemyStep.ts`):
   - chaser: steer toward nearest active-trail point when a trail is exposed,
     else patrol; walls bounce.
   - shooter: patrol + emit `ProjectileState` on a cadence (fire-lane).
   - orbiter: slow circular guard around board center.
   - disruptor: when both players drawing, converge on trail midpoint; else drift.
     Uses existing `chooseEnemyIntent`/`scaleEnemyPressure`.
2. **Projectiles** (pure `src/game/projectile.ts`): spawn (capped at
   `MAX_PROJECTILES_MOBILE`), move, expire off-board/lifetime.
3. **Lives + game-over** (pure `src/game/player.ts`): add `lives` (default 3)
   and `invulnUntil` to `PlayerState`; add `gameOver` to `GameState`.
   `damagePlayer` decrements lives, resets to safe point, grants invuln blink;
   at 0 lives -> `gameOver`.
4. **Combo scoring** (`src/game/scoring.ts`): track consecutive captures without
   a life loss; multiplier boosts `awardCaptureScore`.

## Integration

- Extend `advanceGameStateWithDiagnostics` in `GameScene.ts` to call the new pure
  steps (enemy AI, projectile move/collide, damage, combo). Keep scene returns
  unchanged shape for existing tests.
- `GameScene.create` builds background + glow marker objects; `renderState`
  updates them with glyphs, lives, combo, shimmer, and overlays.

## Tests

- New pure-module Vitest specs: `enemyStep.test.ts`, `projectile.test.ts`,
  `player.test.ts`, scoring combo. Existing specs must stay green.
- Keep `GameScene.test.ts` baseline assertions valid.

## Verification

`npm run lint && npx tsc -p tsconfig.json --noEmit && npm run test && npm run build`
