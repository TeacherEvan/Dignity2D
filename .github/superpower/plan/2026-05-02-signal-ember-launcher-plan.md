# Plan: Signal Ember Launcher Animation

**Date:** 2026-05-02
**Status:** Ready for execution
**Source Design:** `.github/superpower/brainstorm/2026-05-02-signal-ember-launcher-design.md`

## Strategy

Implement the effect as a launcher-local DOM and CSS enhancement, not a runtime feature. The safest path is to keep the existing launcher IDs and copy in place, move the visual treatment out of the large inline-style blob in `src/welcome/WelcomeScreen.ts`, and let `src/launcher.ts` do only minimal state wiring through data attributes and short-lived classes. Reduced motion should be a first-class branch, not a later patch: the reduced variant keeps the static glow and removes timers and animated transitions entirely.

## Ordered Tasks

### Task 1: Lock the DOM contract in tests before changing markup
**Files:** `src/welcome/WelcomeScreen.test.ts`, `src/launcher.test.ts`, `tests/e2e/home.spec.ts`

Work:
- Add failing checks for a dedicated ambient layer in the welcome shell.
- Add stable action and status hooks assertions.
- Add a reduced-motion launcher state assertion that does not remove primary controls or status visibility.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts` and expect the new assertions to fail first.
- Run `npm run test:e2e -- tests/e2e/home.spec.ts` only after the browser-facing test is updated.

### Task 2: Refactor the welcome markup into semantic, CSS-targetable structure while preserving existing control IDs and calm copy
**Files:** `src/welcome/WelcomeScreen.ts`

Work:
- Replace the current inline-heavy presentation with stable structural wrappers for shell, card, title and copy block, action cluster, room section, upload section, status line, and a small ambient ember/glow layer.
- Keep the current launcher text and button IDs so behavior and tests stay anchored.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts` and expect the welcome HTML tests to pass with the new structure.

### Task 3: Introduce one launcher-only stylesheet colocated with `src/welcome/WelcomeScreen.ts` and import it from the launcher path
**Files:** `src/launcher.ts` or `src/main.ts`, plus one new stylesheet under `src/welcome`

Work:
- Move the visual system into CSS variables and class selectors.
- Define the static shell look first, then add CSS-only hover, focus, and response states for cyan charge and restrained amber residue.
- Keep the palette inside the existing void, gold, sand, cyan range, with amber used only as an accent.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts`.
- Run `npm run build` to confirm the stylesheet import stays in the launcher bundle path without pulling Phaser in early.

### Task 4: Add reduced-motion handling as a launcher state, not a separate layout
**Files:** `src/launcher.ts`, `src/launcher.test.ts`, `tests/e2e/home.spec.ts`

Work:
- Detect `prefers-reduced-motion` through `matchMedia` during launcher mount.
- Set a shell-level motion mode attribute.
- Keep the reduced branch static and do not mount idle timers or animation classes when motion is reduced.

Validation:
- Run `npm run test -- src/launcher.test.ts`.
- Run `npm run test:e2e -- tests/e2e/home.spec.ts` with a reduced-motion case.

### Task 5: Add minimal launcher-side state hooks for interaction-linked ember cues
**Files:** `src/launcher.ts`, `src/launcher.test.ts`

Work:
- Wire short-lived state changes for Quick Play, Create Room, Join, Upload Image, and status updates.
- Keep the JavaScript surface small: toggle one active cue at a time, reuse the existing `setStatus` path for residue near the status line, and avoid any dependency on gameplay or Phaser startup.
- Start with interaction and status triggers only; defer autonomous idle pulses unless they still read as calm after review.

Validation:
- Run `npm run test -- src/launcher.test.ts` and expect passing tests for one-active-cue behavior, status residue triggering, and unchanged launch flow.

### Task 6: Add browser-level coverage for scanability on desktop, mobile, and reduced motion
**Files:** `tests/e2e/home.spec.ts`

Work:
- Extend the existing home tests to verify the launcher shell remains readable on mobile.
- Confirm primary controls remain visible.
- Confirm reduced-motion mode does not hide or destabilize the shell.
- Keep the browser assertions structural and readability-focused rather than animation-frame-specific.

Validation:
- Run `npm run test:e2e -- tests/e2e/home.spec.ts`.

### Task 7: Run final verification and a short manual visual pass

Work:
- Confirm narrow tests first, then broader repo health, then manual scanability in desktop and mobile viewports.
- Specifically check that body copy remains still, only one noticeable cue is active at once, and the launcher stays coherent if styles fail or motion is reduced.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts`.
- Run `npm run test:e2e -- tests/e2e/home.spec.ts`.
- Run `npm run build`.
- Run `npm run lint`.

## Risks And Unknowns

- Highest risk: replacing the inline presentation in `src/welcome/WelcomeScreen.ts` without accidentally changing spacing, contrast, or the calm reading order.
- Secondary risk: an idle ember timer can make the launcher feel busy on mobile.
- Unknown: whether the strongest response should prioritize Quick Play, the status line, or the upload trigger. Recommended order: Quick Play and status first, upload second.
- Unknown: whether the reduced-motion branch should keep subtle opacity state changes on focus. Recommended answer: no animated transitions in reduced mode, only static emphasis.

## Follow-up Addendum: Calm Idle Rhythm And Topic Fit

### Task 8: Add a very light idle ember rhythm without increasing interface noise
**Files:** `src/welcome/WelcomeScreen.css`

Work:
- Keep the effect CSS-only and subordinate to the existing interaction cues.
- Use long-duration opacity and drift changes rather than extra bright nodes or more simultaneous events.
- Preserve the reduced-motion branch by relying on the existing `data-motion-mode="reduced"` guard.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts src/launcher.test.ts`.
- Run `npm run build`.

### Task 9: Make launcher copy more topic-appropriate for the territory-capture game
**Files:** `src/welcome/WelcomeScreen.ts`, `src/welcome/WelcomeScreen.test.ts`

Work:
- Retune the title and summary so they feel grounded in tracing, holding, or recovering territory rather than generic restoration language.
- Keep the writing calm, low-density, and easy to scan.

Validation:
- Run `npm run test -- src/welcome/WelcomeScreen.test.ts`.
- Run `npm run build`.