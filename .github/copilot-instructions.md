# Project Guidelines

## Code Style

- Keep TypeScript modules small, deterministic, and easy to unit test.
- Prefer pure logic in gameplay, protocol, and server helper modules over embedding rules in Phaser scene wiring or DOM event glue.
- Preserve existing file layout and public APIs unless the task requires a deliberate boundary change.
- UI copy should stay calm, low-density, and easy to scan; avoid noisy, hype-heavy, or cluttered wording.

## Architecture

- Keep the launcher and runtime split intact: `src/launcher.ts` owns the DOM shell and user intent, `src/bootstrap.ts` lazy-loads Phaser, and `src/scenes/GameScene.ts` starts only after a session is chosen.
- Treat Phaser as presentation and orchestration. Gameplay math, scoring, collision, progression, room validation, and protocol rules should stay in framework-light modules whenever possible.
- Keep shared message contracts centralized in `shared/protocol.ts` and update client and server call sites together when protocol shapes change.

## Build And Test

- Start with the narrowest relevant check before broader validation.
- Use `npm run test` for general Vitest coverage.
- Use `npm run server:test` when touching `server/` or `shared/` behavior.
- Use `npm run perf:mobile` when changing performance profile logic or mobile fallback behavior.
- Use `npm run test:e2e` when changing launcher, startup, or browser-only flow.
- Run `npm run build` and `npm run lint` before wrapping up broader code changes.

## Conventions

- In unit tests, mock Phaser when a test only needs scene shapes, constants, or method calls; do not rely on a real canvas runtime in jsdom-based tests.
- Prefer focused tests next to the touched module and keep behavior checks deterministic.
- Maintain the deferred-loading startup path; avoid reintroducing Phaser into the initial launcher bundle unless the task explicitly requires it.
- Link to existing docs instead of duplicating them when more context is needed, especially `README.md` and `architecture.md`.
