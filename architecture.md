# Dignity Arcade Architecture

## Purpose

Dignity Arcade is structured as a logic-first Phaser + TypeScript game. The repo favors deterministic, testable modules for gameplay, networking contracts, upload policy, and performance fallbacks, with Phaser scenes acting as a thin presentation layer.

## Runtime Layout

- Client shell: Vite serves the browser app and boots Phaser from `src/main.ts`.
- Game container: `src/game/config.ts` configures a mobile-sized WebGL Phaser game with FIT scaling and registers the scene list from `src/scenes/sceneRegistry.ts`.
- Scenes: `BootScene` immediately routes to `HomeScene`, and `HomeScene` exposes the current entry points for solo play, room creation, and image upload. `GameScene` currently initializes a default solo state and renders a minimal HUD/canvas frame.
- Pure game rules: territory capture, scoring, border safety, collision handling, enemy generation, and reveal formatting live in pure TypeScript modules under `src/game`, `src/enemies`, `src/input`, and `src/render`.
- Theme layer: palette, trail styling, Voronoi shader, ACES tonemapping, and performance selection live under `src/theme` and `src/performance`.
- Shared contracts: message shapes shared between client and server live in `shared/protocol.ts`.
- Server-side logic: room lifecycle, co-op capture validation, and upload policy live under `server/rooms` and `server/upload`.

## Module Boundaries

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
- `server/upload/processImage.ts` normalizes retention windows, keeps uploads non-public, strips metadata, and converts output to WebP.
- `server/upload/transformImage.ts` is the image-processing hook used by server-side tests and future API wiring.

### 6. Online Co-op Foundations

Networking is represented by tested contracts and room logic:

- `shared/protocol.ts` defines typed client/server messages.
- `server/rooms/RoomManager.ts` manages two-player room creation/join flow and room versioning.
- `src/net/RoomClient.ts` provides interpolation helpers and ranked-scoring pause logic for high latency.
- `server/rooms/captureValidation.ts` validates merged co-op trails using the same closure logic as solo capture.

## Data Flow

Current intended flow:

1. Phaser boots and enters `HomeScene`.
2. A solo game creates `GameState` with `createInitialGameState()`.
3. Input math feeds movement.
4. Border logic decides whether the player remains safe or starts drawing.
5. Closed trails become capture regions.
6. Scoring updates reveal progress and win state.
7. Theme and performance modules decide how much visual polish is enabled.
8. Shared protocol and room logic are available for later server/bootstrap wiring.

## Testing Strategy

The repo is biased toward small deterministic tests:

- Unit tests cover gameplay state, capture logic, scoring, collisions, input math, enemies, protocol messages, room management, upload policy, theme math, and performance fallbacks.
- Playwright smoke covers the browser entry path and confirms the canvas-based home screen loads.
- Phaser-heavy tests are kept shallow; when needed, tests mock Phaser instead of requiring a full canvas runtime.

## Verified Commands

The following commands were run successfully against the current codebase on 2026-05-01:

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run perf:mobile`
- `npm run test:e2e`

## Current Gaps

The repo has strong logic coverage, but the runtime wiring remains deliberately thin in a few places:

- `GameScene` currently shows a minimal frame and HUD rather than the full gameplay loop.
- Room management and upload logic exist as modules, but there is not yet a full server bootstrap or HTTP/WebSocket transport entrypoint in this repo.
- The production build currently emits a large client bundle warning from Vite, which should be addressed before shipping to lower-end devices.

This means the architecture is ready for continued feature wiring, but the repo should be described as a well-tested gameplay foundation rather than a fully integrated shipped game.