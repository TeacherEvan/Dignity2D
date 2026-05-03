# Dignity2D Next-Phase Product Polish And Runtime Cohesion Plan

**Status:** Partially implemented; use as historical plan plus remaining backlog input

Implementation note: the launcher-completion slice from this plan has largely landed, but the runtime-cohesion slice has not. Use `README.md` and `architecture.md` for current repo truth, and use `.github/superpower/plan/2026-05-04-runtime-cohesion-remaining-backlog.md` for the current remaining work order.

**Goal / JTBD**

When a first-time or returning player lands in Dignity2D, they should be able to understand the shell immediately, use every visible launcher control, carry their device and accessibility context cleanly into play, and get clearer feedback as they move between solo and room play without the launcher and Phaser runtime feeling like separate products.

**Source Inputs / Assumptions**

- No saved UX artifacts were found under `.github/superpower/ux`, so this plan is based on current repo evidence plus prior saved design and plan docs rather than a dedicated UX artifact set.
- Primary reference docs: `.github/superpower/brainstorm/2026-05-02-signal-ember-launcher-design.md`, `.github/superpower/plan/2026-05-02-signal-ember-launcher-plan.md`, `.github/superpower/plan/2026-05-02-device-layout-diagnostics-progression-plan.md`, `README.md`, and `architecture.md`.
- Verified current control points: `src/launcher.ts`, `src/welcome/WelcomeScreen.ts`, `src/game/config.ts`, `src/scenes/GameScene.ts`, `src/diagnostics/EventTracker.ts`, `src/net/RoomClient.ts`, and `shared/protocol.ts`.
- Working assumptions:
  - Keep the launcher/runtime split intact.
  - Keep Phaser at the orchestration edge and move reusable rules into pure helpers when new logic appears.
  - Keep multiplayer guest-friendly and two-player.
  - Keep diagnostics privacy-safe and session-scoped unless later work explicitly adds a sink.

**Priority Order**

1. Finish the launcher shell so every visible control is real and testable.
2. Make runtime sizing and HUD behavior obey the launcher's resolved layout and motion context.
3. Turn current room and protocol foundations into a real runtime client path with stronger behavioral coverage.
4. Polish in-game feedback only after the runtime has the right context to speak from.

## Verified Status Snapshot

- Completed for the current phase: launcher settings and accessibility controls, reduced-motion shell behavior, launcher-local visual treatment, layout preference persistence, launcher browser coverage, and room create/join launch flow.
- Still pending: live launcher diagnostics wiring, layout-aware runtime sizing, a real RoomClient transport layer, room-aware GameScene runtime hydration, and live runtime diagnostics.
- Current code evidence: `src/launcher.ts` carries resolved layout and motion data into launch requests, but `src/scenes/GameScene.ts` still uses a fixed board model and `src/net/RoomClient.ts` remains helper-only.

## Milestone 1: Launcher Completion And Live Shell Observability

### Task 1: Wire the Settings and Accessibility controls into real launcher surfaces

**Files likely touched:** `src/launcher.ts`, `src/welcome/WelcomeScreen.ts`, `src/welcome/WelcomeScreen.css`, `src/display/LayoutPreferences.ts`, `src/launcher.test.ts`, `src/welcome/WelcomeScreen.test.ts`, `tests/e2e/home.spec.ts`

**Work**

- Extend launcher and welcome tests to prove the two secondary controls are not dead.
- Add a lightweight launcher-side settings surface that uses existing layout preference infrastructure instead of inventing a separate subsystem.
- Allow the player to change persisted handedness and joystick scale for the detected device class.
- Add an accessibility surface that exposes the active motion mode and practical control guidance without pulling Phaser into the initial shell.
- Keep copy calm, low-density, and consistent with the current launcher voice.

**Narrow validation**

- `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts`

**Checkpoint / rollback**

- Stop here once the shell has working controls and passing DOM tests.
- If the interaction model is wrong, revert only the launcher and welcome slice and leave runtime code untouched.

### Task 2: Put the diagnostic tracker into the live launcher flow

**Files likely touched:** `src/diagnostics/EventTracker.ts`, `src/launcher.ts`, `src/session.ts`, `src/diagnostics/EventTracker.test.ts`, `src/launcher.test.ts`

**Work**

- Add tests around allowed payloads and launcher event emission before wiring the tracker.
- Instantiate a session-scoped tracker during launcher mount.
- Record only allowed, non-sensitive events that already fit the current allowlist: `welcome_viewed`, `display_detected`, `layout_loaded`, `solo_started`, `multiplayer_started`, `room_created`, and `room_joined`.
- Do not record room IDs, image URLs, file names, or free text.
- Keep the sink local and optional for now so this phase improves observability without creating an analytics infrastructure commitment.

**Narrow validation**

- `npm run test -- src/diagnostics/EventTracker.test.ts src/launcher.test.ts`

**Checkpoint / rollback**

- Checkpoint after launcher diagnostics are present and privacy tests still pass.
- If payload safety becomes ambiguous, roll back to the prior launcher-only state and leave the tracker module unchanged.

## Milestone 2: Layout-Aware Runtime Instead Of Fixed Runtime

### Task 3: Replace fixed Phaser sizing with a layout-aware runtime model

**Files likely touched:** `src/bootstrap.ts`, `src/game/config.ts`, `src/session.ts`, `src/display/DeviceLayout.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameScene.test.ts`

**Work**

- Add tests around pure helpers and scene helpers before moving runtime sizing.
- Remove the hard-coded runtime assumptions currently split between the fixed config in `src/game/config.ts` and the static board size in `src/scenes/GameScene.ts`.
- Use the resolved layout ID and pending launch data to derive runtime dimensions, board placement, and HUD offsets from the standard layout model.
- Keep sizing logic out of Phaser where possible so it remains deterministic and unit-testable.

**Narrow validation**

- `npm run test -- src/scenes/GameScene.test.ts`
- `npm run test -- src/launcher.test.ts`

**Checkpoint / rollback**

- Checkpoint once quick play still launches and scene helper tests pass with layout-derived values.
- If runtime sizing introduces regressions, revert this milestone without touching multiplayer or copy work.

### Task 4: Make the HUD and session feedback layout-aware and less debug-leaning

**Files likely touched:** `src/scenes/GameScene.ts`, `src/scenes/HudFeedback.ts`, `src/scenes/GameScene.test.ts`

**Work**

- Add tests around status text and HUD snapshot behavior before revising the scene copy.
- Replace debug-heavy or placeholder runtime text such as raw mask details with session-aware, player-facing feedback that reflects solo play, room play, territory stage, and win state.
- Keep decision logic in pure helpers alongside the scene instead of embedding more branching inside Phaser lifecycle methods.
- Align the runtime voice with the calmer launcher tone once layout and session context are available.

**Narrow validation**

- `npm run test -- src/scenes/GameScene.test.ts src/scenes/HudFeedback.test.ts`

**Checkpoint / rollback**

- Checkpoint once the scene status model is readable and deterministic in tests.
- If wording needs revision, revert only the copy and helper changes, not the layout model.

## Milestone 3: Room Foundations Into A Real Runtime Client Path

### Task 5: Turn RoomClient from helpers into a typed transport adapter

**Files likely touched:** `src/net/RoomClient.ts`, `src/net/RoomClient.test.ts`, `shared/protocol.ts`, `shared/protocol.test.ts`, `server/index.ts`, `server/index.test.ts`, `server/rooms/RoomManager.ts`, `server/rooms/RoomManager.test.ts`

**Work**

- Add tests at the client transport boundary and shared protocol boundary before wiring transport behavior.
- Build a thin WebSocket client that can connect, send `input-frame` and `capture-proposal` messages, request reconnect, and consume `state-sync` or `error` messages without pulling gameplay rules into the networking layer.
- Keep protocol changes minimal and only expand `shared/protocol.ts` if the current room and `stateVersion` payloads are proven insufficient during integration.
- Update shared validators, server handlers, and client consumers together if protocol changes are required.

**Narrow validation**

- `npm run test -- src/net/RoomClient.test.ts`
- `npm run server:test`

**Checkpoint / rollback**

- Checkpoint once the transport API is stable and protocol tests pass.
- Do not start scene integration until the client contract is deterministic.

### Task 6: Thread multiplayer runtime state through launcher, bootstrap, and GameScene

**Files likely touched:** `src/launcher.ts`, `src/bootstrap.ts`, `src/session.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameScene.test.ts`, `tests/e2e/home.spec.ts`

**Work**

- Add tests around session mode resolution and scene helper behavior before scene integration.
- Use the launch data already produced by create and join flows to start `GameScene` in a room-aware mode that can hydrate from reconnect and `state-sync` instead of behaving like solo mode with a room label.
- Keep solo unchanged.
- Broaden browser coverage beyond `canvas` visibility so the e2e path proves launcher-to-room-to-runtime continuity and return-to-launcher stability.

**Narrow validation**

- `npm run test -- src/session.test.ts src/scenes/GameScene.test.ts`
- `npm run test:e2e -- tests/e2e/home.spec.ts`

**Checkpoint / rollback**

- Checkpoint once create and join still work end-to-end and the runtime no longer treats multiplayer as a cosmetic label only.
- If scene integration becomes unstable, roll back to the transport-only milestone and keep the launcher and protocol work.

## Milestone 4: Runtime Feedback, Diagnostics Completion, And Hardening

### Task 7: Finish live runtime diagnostics and first-run feedback loops

**Files likely touched:** `src/diagnostics/EventTracker.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameScene.test.ts`, `src/performance/PerformanceProfile.ts`, `src/performance/PerformanceProfile.test.ts`

**Work**

- Add tests around explicit state-transition event emission before wiring runtime diagnostics.
- Wire the existing runtime event names into real play transitions: `capture_committed`, `trail_cancelled`, `enemy_collision`, and `performance_fallback` when those conditions already exist in the runtime.
- Keep payloads limited to the existing allowlist.
- Pair instrumentation with clearer moment-to-moment status updates so the player gets immediate feedback when territory is gained, a run is interrupted, or effects are reduced.

**Narrow validation**

- `npm run test -- src/scenes/GameScene.test.ts`
- `npm run perf:mobile`

**Checkpoint / rollback**

- Checkpoint once runtime diagnostics are live and privacy-safe without changing gameplay math.
- If instrumentation starts leaking too much implementation detail into player-facing UI, keep the diagnostics and revert only the copy layer.

### Task 8: Final verification and release checkpoint

**Files likely touched:** none beyond the slices above

**Work**

- Run narrow suites first, then broader verification.
- Confirm the launcher still mounts without Phaser, quick play still defers runtime startup, room flows still work, reduced motion still stays stable, and mobile layout still holds together.

**Validation**

- `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts src/scenes/GameScene.test.ts src/net/RoomClient.test.ts`
- `npm run server:test`
- `npm run perf:mobile`
- `npm run test:e2e -- tests/e2e/home.spec.ts`
- `npm run build`
- `npm run lint`

**Checkpoint / rollback**

- This is the go or no-go point.
- If broad validation fails, revert to the last green milestone rather than patching across unrelated slices.

## Risks And Sequencing Rationale

- Start with launcher completion because dead visible controls are the clearest product gap and the cheapest high-signal fix.
- Put diagnostics into the live launcher early because later layout and room work will be easier to validate if the actual flow is observable.
- Do layout-aware runtime work before multiplayer because room play should land on a stable board and HUD contract, not on fixed solo assumptions.
- Keep protocol expansion minimal because the current shared protocol already covers create, join, `input-frame`, `capture-proposal`, reconnect, and `state-sync`. The initial risk is not missing message types but missing a thin, tested client that uses them.
- Leave copy polish until after the runtime knows the player's layout, session mode, and room state. Otherwise the same strings will likely be rewritten twice.

## Explicitly Deferred

- A broad settings architecture beyond layout preferences and accessibility guidance.
- Persistent or server-backed diagnostics sinks, dashboards, or analytics pipelines.
- New matchmaking, accounts, ranked multiplayer, or spectator flows.
- Rich multiplayer game-state features that require protocol expansion beyond the current reconnect and `state-sync` model unless integration proves a specific missing field.
- Large visual redesigns, shader passes, or theme overhauls unrelated to launcher/runtime cohesion.
- Any refactor that moves core capture, scoring, or collision rules into Phaser scene methods.