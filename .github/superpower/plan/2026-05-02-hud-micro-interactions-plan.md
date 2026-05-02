# Plan: Gameplay HUD Micro-Interactions

**Date:** 2026-05-02
**Status:** Ready for execution

## Strategy

Keep the change narrow: add one pure HUD feedback helper that compares the previous and next HUD snapshot and emits a small cue such as capture, stage-up, or win. Then wire that cue inside `src/scenes/GameScene.ts` to one lightweight animation moment on the reveal and status HUD, plus a smaller supporting score pulse. Respect reduced motion by passing a motion flag through `src/launcher.ts` and `src/session.ts` into the scene, so the scene stays focused on presentation and can switch to static emphasis instead of tweened movement or scaling.

## Ordered Tasks

### Task 1: Add a pure HUD feedback helper
**Files:** `src/scenes/HudFeedback.ts`, `src/scenes/HudFeedback.test.ts`

Work:
- Define a tiny HUD snapshot shape.
- Return whether the scene should trigger a cue when score, revealed ratio, territory label, or win state changes.
- Keep the logic deterministic and framework-light.

Validation:
- Run `npm run test -- src/scenes/HudFeedback.test.ts`.

### Task 2: Extend the launch contract for reduced motion in gameplay
**Files:** `src/session.ts`, `src/session.test.ts`, `src/launcher.ts`, `src/launcher.test.ts`

Work:
- Reuse the existing launcher reduced-motion detection.
- Carry a simple `full` or `reduced` motion mode in launch data.
- Keep defaults safe for any scene start path that omits the motion mode.

Validation:
- Run `npm run test -- src/session.test.ts src/launcher.test.ts`.

### Task 3: Wire HUD cues into the scene
**Files:** `src/scenes/GameScene.ts`, `src/scenes/GameScene.test.ts`

Work:
- Add a previous HUD snapshot field.
- Detect cue-worthy transitions only when displayed values actually change.
- Apply one high-value cue such as a brief reveal and status pop on capture or territory-stage change.
- Add one lighter supporting cue such as a quick score alpha or scale tick when score increases.
- In reduced mode, skip tweened motion and use only static emphasis.

Validation:
- Run `npm run test -- src/scenes/HudFeedback.test.ts src/scenes/GameScene.test.ts`.

### Task 4: Final polish and regression check
**Files:** `src/scenes/GameScene.ts`, `src/scenes/HudFeedback.ts`, `src/session.ts`, `src/launcher.ts`

Work:
- Ensure tweens are not recreated every frame and only fire on transition edges.
- Keep the idle HUD stable.

Validation:
- Run `npm run test -- src/scenes/HudFeedback.test.ts src/scenes/GameScene.test.ts src/session.test.ts src/launcher.test.ts`.
- Run `npm run build`.
- Run `npm run lint`.
- Do one manual browser gameplay smoke check.

## Risks And Unknowns

- `src/scenes/GameScene.ts` re-renders HUD text every frame, so the main failure mode is accidentally restarting animations continuously.
- `src/scenes/GameScene.test.ts` is helper-oriented rather than live-scene runtime coverage, so a manual smoke check is still required.
- Passing motion preference through `src/session.ts` slightly broadens the launch contract and must default safely.
- Reduced-motion fallback should use static emphasis only rather than motion-heavy cues.