# Dignity2D Runtime Cohesion Remaining Backlog

**Status:** Current remaining work order

This file is the concrete follow-up backlog after the 2026-05-04 implementation audit. It replaces the stale "ready for execution" assumption in the older product-polish plan.

Use `README.md` and `architecture.md` as current repo truth. Use this file to sequence the remaining runtime-cohesion work that is not yet implemented.

## Already Landed

- Launcher settings and accessibility controls are live.
- Reduced-motion launcher behavior is live.
- Layout detection and per-device layout preference persistence are live.
- Room create/join browser flow works through the launcher.
- Launcher and room browser coverage already exist.

## Remaining Work

### 1. Wire live launcher diagnostics

Why this remains:
- `src/diagnostics/EventTracker.ts` exists, but `src/launcher.ts` does not create a tracker or emit live launcher events.

Work:
- Create one session-scoped tracker during launcher mount.
- Emit only allowlisted events already supported by `EventTracker`: `welcome_viewed`, `display_detected`, `layout_loaded`, `layout_saved`, `solo_started`, `multiplayer_started`, `room_created`, and `room_joined`.
- Keep payloads privacy-safe: device/layout/mode only, with no room IDs, image URLs, file names, or free text.

Validation:
- `npm test -- src/diagnostics/EventTracker.test.ts src/launcher.test.ts`

### 2. Make runtime sizing derive from layout data

Why this remains:
- `src/scenes/GameScene.ts` still uses a fixed `BOARD_SIZE` and fixed HUD/board placement instead of deriving runtime geometry from the resolved layout.

Work:
- Introduce pure helpers that translate `layoutId` and viewport context into board bounds, HUD anchors, and preview placement.
- Keep the sizing math outside Phaser scene lifecycle code where possible.
- Pass the derived runtime model through bootstrap/session launch data cleanly enough to unit test it.

Validation:
- `npm test -- src/scenes/GameScene.test.ts src/launcher.test.ts`

### 3. Replace helper-only RoomClient with a real transport adapter

Why this remains:
- `src/net/RoomClient.ts` currently contains interpolation and latency helpers only.
- The actual reconnect websocket logic lives in `src/net/serverApi.ts` and does not expose an ongoing typed room transport.

Work:
- Build a small typed client that owns websocket connect, reconnect, send, receive, and teardown for room play.
- Support `input-frame`, `capture-proposal`, reconnect, `state-sync`, and `error` without moving gameplay rules into networking code.
- Keep protocol changes minimal and shared with `shared/protocol.ts` only when integration proves new fields are necessary.

Validation:
- `npm test -- src/net/RoomClient.test.ts`
- `npm run server:test`

### 4. Make GameScene genuinely room-aware

Why this remains:
- Multiplayer launch data reaches the scene, but current scene behavior mostly uses room data as a status label rather than a distinct runtime path.

Work:
- Hydrate room launches from reconnect and `state-sync` data instead of treating multiplayer as solo with room metadata.
- Keep solo behavior unchanged.
- Add helper-level scene tests that prove multiplayer state setup differs meaningfully from solo setup.

Validation:
- `npm test -- src/session.test.ts src/scenes/GameScene.test.ts`
- `npm run test:e2e -- tests/e2e/home.spec.ts`

### 5. Wire live runtime diagnostics and player-facing feedback

Why this remains:
- `src/scenes/GameScene.ts` does not emit diagnostic events yet.

Work:
- Emit `capture_committed`, `trail_cancelled`, `enemy_collision`, and `performance_fallback` when those transitions actually occur.
- Keep payloads inside the existing allowlist.
- Pair the instrumentation with clearer player-facing status feedback only where it reflects real transitions.

Validation:
- `npm test -- src/scenes/GameScene.test.ts src/diagnostics/EventTracker.test.ts`
- `npm run perf:mobile`

## Recommended Order

1. Launcher diagnostics
2. Layout-aware runtime model
3. RoomClient transport adapter
4. Room-aware GameScene integration
5. Runtime diagnostics and feedback pass

## Release Checkpoint After Backlog Completion

- `npm test -- src/launcher.test.ts src/welcome/WelcomeScreen.test.ts src/session.test.ts src/scenes/GameScene.test.ts src/net/RoomClient.test.ts src/diagnostics/EventTracker.test.ts`
- `npm run server:test`
- `npm run perf:mobile`
- `npm run test:e2e -- tests/e2e/home.spec.ts`
- `npm run build`
- `npm run lint`