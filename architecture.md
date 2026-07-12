# Dignity Arcade Architecture

## Purpose

Dignity Arcade is structured as a logic-first Phaser + TypeScript game. The repo favors deterministic, testable modules for gameplay, networking contracts, upload policy, and performance fallbacks, with Phaser scenes acting as a thin presentation layer.

This document is the current implementation truth. The brainstorm and plan files under `.github/superpower/` remain useful as historical design and execution inputs, but they should not override the current runtime and module boundaries described here.

## Runtime Layout

- Client shell: Vite serves the browser app and mounts the DOM launcher from `src/main.ts`.
- Launcher flow: `src/launcher.ts` owns quick play, room create/join, upload preview, and the return-to-launcher path before Phaser is loaded.
- Game bootstrap: `src/bootstrap.ts` lazy-loads Phaser and `src/game/config.ts`, creates the runtime only on first launch, and restarts `GameScene` with fresh session data for subsequent launches.
- Bundle strategy: Phaser is intentionally deferred behind launcher intent and split into subsystem chunks at build time so the browser avoids downloading one oversized runtime asset up front.
- Scene surface: `src/scenes/GameScene.ts` is the only Phaser scene in the current client bundle. It initializes the solo state, renders the board and preview card, and consumes launch data from `src/session.ts`.
- Pure game rules: territory capture, scoring, border safety, collision handling, enemy generation, and reveal formatting live in pure TypeScript modules under `src/game`, `src/enemies`, `src/input`, and `src/render`.
- Theme layer: palette, trail styling, Voronoi shader, ACES tonemapping, and performance selection live under `src/theme` and `src/performance`.
- Shared contracts: message shapes shared between client and server live in `shared/protocol.ts`.
- Server-side logic: room lifecycle, co-op capture validation, and upload policy live under `server/rooms` and `server/upload`.

## Module Boundaries

### Display, Layout, And Diagnostics

`src/display` owns viewport-to-device classification, standard control and HUD layouts, and versioned layout preference persistence. `src/welcome` owns testable launcher markup. `src/diagnostics` owns privacy-safe event tracking for local diagnostics and future observability sinks.

Territorial progression lives in `src/progression/territoryProgression.ts`, while enemy intent and pressure rules live in `src/enemies/EnemyBehavior.ts`.

### 1. Core Gameplay State

`src/game/types.ts` defines the canonical gameplay state:

- `GameState` owns image size, reveal ratio, players, captures, enemies, projectiles, and win state.
- `PlayerState` tracks the active trail, last safe point, health, score, and mode.
- `createInitialGameState()` produces a deterministic solo baseline used by the current `GameScene`.

### 2. Capture and Safety Rules

Core capture rules are intentionally framework-free so they can be reused by both client and server:

- `src/game/geometry/border.ts` determines whether a point is on the outer border, inside a polygon, or in a safe zone.
- `src/game/capture/trailState.ts` handles safe movement, unsafe movement, trail creation, and trail cancellation.
- `src/game/capture/captureArea.ts` closes trails, computes polygon area, creates capture regions, and updates `revealedRatio`.
- `src/game/scoring.ts` owns the 75% win threshold and score calculation.
- `src/game/collision.ts` detects projectile-to-trail collisions and resets the player to the last safe point.

This keeps the hardest game rule surface deterministic and easy to verify with Vitest.

### 3. Arcade Pressure

`src/enemies/EnemySpawner.ts` defines lightweight enemy-wave creation for mobile play, and `src/input/VirtualJoystick.ts` keeps movement math pure so touch input can be tested without a browser runtime.

### 4. Rendering and Theme

The visual layer is split into small pieces:

- `src/render/RevealMask.ts` handles reveal text formatting and mask resolution sizing.
- `src/theme/palette.ts` defines the Golden Cyberpunk Egyptian token set.
- `src/theme/TrailStyle.ts` selects safe defaults and reduced-effects fallbacks.
- `src/theme/VoronoiPostFX.ts` and `src/theme/ACESTonemapping.ts` provide Phaser-compatible shader strings and thin pipeline wrappers.
- `src/performance/PerformanceProfile.ts` disables expensive effects on low FPS, reduced motion, or known slow GPU strings.

The architecture assumes gameplay remains readable even if shader-based polish is disabled.

### 5. Upload and Privacy

Upload behavior is intentionally privacy-first:

- `src/upload/ImagePicker.ts` limits accepted file types and enforces a 10 MB client-side size cap.
- `server/upload/processImage.ts` normalizes retention windows, strips metadata, enforces the server-side upload size cap, and converts output to WebP.
- `server/ImageStore.ts` issues signed image access tokens and expires in-memory uploads when their retention window closes.
- `server/upload/transformImage.ts` is the image-processing hook used by server-side tests and future API wiring.

### 6. Online Co-op Foundations

Networking is represented by tested contracts and room logic:

- `shared/protocol.ts` defines typed client/server messages.
- `server/rooms/RoomManager.ts` manages two-player room creation/join flow and room versioning.
- `src/net/RoomClient.ts` provides interpolation helpers and ranked-scoring pause logic for high latency.
- `server/rooms/captureValidation.ts` validates merged co-op trails using the same closure logic as solo capture.

## Data Flow

Current intended flow:

1. The DOM launcher mounts immediately and collects room and upload intent before the Phaser bundle is requested.
2. Launcher actions call `startGameSession()`, which stores pending launch data and lazy-loads Phaser plus the runtime config.
3. `GameScene` merges the pending launch data into scene init, creates `GameState` with `createInitialGameState()`, and renders the board plus upload preview.
4. Input math feeds movement.
5. Border logic decides whether the player remains safe or starts drawing.
6. Closed trails become capture regions.
7. Scoring updates reveal progress and win state.
8. Theme and performance modules decide how much visual polish is enabled.
9. Shared protocol and room logic back the create/join/upload flows used by the launcher.

## Testing Strategy

The repo is biased toward small deterministic tests:

- Unit tests cover gameplay state, capture logic, scoring, collisions, input math, enemies, protocol messages, room management, upload policy, theme math, and performance fallbacks.
- Browser coverage includes bootstrap tests for lazy Phaser startup plus Playwright smoke for launcher create/join/upload flows and canvas visibility.
- Phaser-heavy tests are kept shallow; when needed, tests mock Phaser instead of requiring a full canvas runtime.

## Verified Commands

The following commands were run successfully against the current codebase on 2026-05-02:

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run perf:mobile`
- `npm run test:e2e`

## Current Gaps

The repo has strong logic coverage, but the runtime wiring remains deliberately thin in a few places:

- `GameScene` currently focuses on the playable solo loop and status HUD rather than a fully polished progression-driven game shell.
- The launcher is DOM-first by design, so visual cohesion between the pre-game shell and Phaser scene should continue to be refined as features land.
- Phaser bundle size is now managed through lazy loading and subsystem chunking, but runtime startup cost should still be monitored on lower-end devices as more features are added.

## Documentation Order

- `README.md` is the primary entry point for setup, scripts, and current product-facing scope.
- `architecture.md` is the authoritative description of current runtime structure and module ownership.
- `.github/superpower/plan/jobcard.md` is only a lightweight historical execution note.
- `.github/superpower/brainstorm/...` and `.github/superpower/plan/...` are archival inputs that explain why the repo looks the way it does, not what still needs to be built next.

This means the architecture is ready for continued feature wiring, but the repo should be described as a well-tested gameplay foundation rather than a fully integrated shipped game.

One important deployment constraint remains: upload retention is enforced as a maximum lifetime inside the current in-memory server process. Restarting the server clears uploads before those maximum lifetimes elapse.
