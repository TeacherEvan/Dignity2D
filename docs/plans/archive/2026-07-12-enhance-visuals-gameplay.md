# Implementation Plan — Visuals & Gameplay Enhancement

TDD: each task = write failing test -> implement -> green -> commit (parent session,
no auto-commit unless asked).

## Track A — Gameplay (pure, tested)

- [ ] A1 `src/enemies/enemyStep.ts`: `stepEnemies(state, deltaMs, now, ctx)` ->
      {enemies, projectiles}. Per-kind intent steering. Test: chaser homes trail,
      shooter emits projectile on cadence, orbiter circles center, disruptor
      converges when both drawing, walls bounce.
- [ ] A2 `src/game/projectile.ts`: `spawnProjectile`, `stepProjectiles` (move +
      expire), `projectileHitsPlayer`. Test move/expire/hit.
- [ ] A3 `src/game/player.ts`: add `lives`,`invulnUntil` to PlayerState;
      `damagePlayer(state, id, now)` -> {state, lostLife}; at 0 lives set
      `gameOver`. Add `gameOver` to GameState. Test lives decrement, invuln
      window, game-over.
- [ ] A4 `src/game/scoring.ts`: combo multiplier. `registerCapture`/`resetCombo`
      helpers; `awardCaptureScore` uses combo. Test combo boost + reset on loss.

## Track B — Integration

- [ ] B1 Extend `advanceGameStateWithDiagnostics` to run A1-A4 steps; keep return
      shape. Update GameScene tests if baseline shifts (should not).

## Track C — Visuals (Golden Cyberpunk Egyptian)

- [ ] C1 Background scanline grid + vignette, pre-rendered to RenderTexture once +
      animated sweep (cheap). Reduced-motion: static only.
- [ ] C2 Neon glow orbs: layered-circle glow + per-kind glyphs for player/enemies.
      WebGL preFX glow when available else fallback.
- [ ] C3 Glowing trail (layered stroke + pulsing tip) and capture shimmer (fill +
      animated highlight stroke).
- [ ] C4 HUD: lives glyphs, combo meter, category-colored enemy tags, stronger seal.
- [ ] C5 Win ("IMAGE SECURED" burst) / Lose ("SIGNAL LOST" + retry) overlays;
      pause spawns on gameOver.

## Verify

`npm run lint && npx tsc -p tsconfig.json --noEmit && npm run test && npm run build`
