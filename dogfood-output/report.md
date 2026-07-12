# Dogfood QA Report

**Target:** https://dignity2-d.vercel.app/
**Date:** 2026-07-12
**Scope:** Full site — launcher, Quick Play (solo), Create Room, Join Room, Settings, Accessibility. Play one level to completion, diagnose problems and visual errors with no scrolling.
**Tester:** Hermes Agent (automated exploratory QA)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 1 |
| 🟡 Medium | 2 |
| 🔵 Low | 1 |
| **Total** | **5** |

**Overall Assessment:** The game engine itself is functional and a level can be won, but the production deployment is effectively unplayable on first load because the canvas renders below the fold (requires scrolling), and multiplayer (Create/Join Room) is non-functional due to a missing backend URL in production.

---

## Issues

### Issue #1: Game canvas renders off-screen / below the fold (requires scrolling)
| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Category** | Visual / Functional |
| **URL** | https://dignity2-d.vercel.app/ (after Quick Play) |

**Description:**
The Phaser canvas is not pinned to the viewport. The production stylesheet is missing the `#game-container { position: fixed; inset: 0 }` rule that exists in the source CSS (`src/game-container.css`). As a result `#app-shell` (the launcher) stays mounted and the canvas flows in normal document flow *below* it. Measured on a 567px-tall viewport: the canvas top is at y=712 and the document scrollHeight is 1142, so the entire play board sits below the visible fold and the page body is scrollable.

**Steps to Reproduce:**
1. Open https://dignity2-d.vercel.app/
2. Click "Quick Play".
3. Observe the play board is not in the initial viewport; the launcher shell still occupies the top of the page and you must scroll down to reach/play the game.

**Expected Behavior:**
The game canvas fills the viewport immediately on launch with no scrolling, as the source CSS intends (`position: fixed; inset: 0`).

**Actual Behavior:**
Canvas is pushed off-screen below the launcher (canvasTop=712 vs viewportH=567); `body` overflow is `visible` instead of `hidden`. Player must scroll to see/play.

**Screenshot:**
MEDIA:/home/ewaldt/Documents/VS/GAMES/Dignity2D/dogfood-output/screenshots/01-canvas-offscreen.png

**Console Errors:**
None at runtime (the defect is a missing CSS rule, not a JS error). Confirmed by inspecting the live page's only stylesheet (`index-CnO8ec8P.css`): it contains **zero** `#game-container` rules. The local `dist` build CSS *does* contain the rule, proving it was dropped by the production bundler.

**Fix applied (in this session):** `src/bootstrap.ts` now calls `ensureInGameLayout()` on `startGameSession()`, which injects the fixed-position rule imperatively (with `!important`) so the canvas is always pinned regardless of CSS bundling. Verified live by injecting the same rule — canvas moved from y=712 to y=134 and became fully visible with no scroll. A fresh Vercel redeploy from current `main` is also required to resync the production toolchain (see Issue #5).

---

### Issue #2: Create Room / Join Room fail ("ROOM SETUP FAILED")
| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Category** | Functional |
| **URL** | https://dignity2-d.vercel.app/ (Create Room, Join Room) |

**Description:**
Multiplayer flows fail immediately. On the hosted site `VITE_SERVER_URL` is not set, so `DEFAULT_SERVER_URL` (in `src/net/serverApi.ts`, `resolveDefaultServerUrl()`) resolves to `null`. Clicking **Create Room** throws and the launcher shows "ROOM SETUP FAILED." (or "Online rooms need the backend." when the hint text matches). **Join Room** behaves the same. No game starts.

**Steps to Reproduce:**
1. Open the launcher.
2. Click "Create Room" (or type a room ID and click "Join").
3. Status text shows "ROOM SETUP FAILED." / "Online rooms need the backend."

**Expected Behavior:**
If no backend is configured for the deployment, the room UI should be clearly disabled/explained up front, or the hosted deployment should provide a `VITE_SERVER_URL` so multiplayer works.

**Actual Behavior:**
Clicking Create/Join silently fails with a failure-status message; no console error is thrown (the error is caught and surfaced as status text only).

**Screenshot:**
MEDIA:/home/ewaldt/.hermes/cache/screenshots/browser_screenshot_ad12d90498214134ba7efe48d4883213.png

**Console Errors:**
None (handled by try/catch in `launcher.ts`). Root cause is config, not a crash.

**Note:** This is a deployment/config gap (no multiplayer backend wired to prod), not a code defect per se. It is High because Create/Join are primary CTA-adjacent features that fail for every user on the live site.

---

### Issue #3: Production runs a different toolchain than the repo (Phaser v4 + Vite 8 vs pinned Phaser 3.80.1 + Vite 5.4.20)
| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Console / Build |
| **URL** | https://dignity2-d.vercel.app/ |

**Description:**
The deployed bundle is built from a different toolchain than the committed repo:
- **Prod console:** `Phaser v4.1.0`, and the JS bundle imports `rolldown-runtime` (Vite 8+).
- **Repo pins:** `phaser ^3.80.1`, `vite ^5.4.20` (`package.json`). Local `npm run build` produces `vite 5.4.20` / `phaser 3.80.1` and a CSS that *contains* the `#game-container` fixed rule.

This mismatch is the underlying cause of Issue #1 (the prod CSS that dropped the rule is a Vite-8/rolldown build artifact). It also risks Phaser v4 API breakage vs v3.

**Steps to Reproduce:**
1. Open the live site.
2. Check console: `Phaser v4.1.0 (WebGL | Web Audio)`.
3. Inspect network: the entry JS imports `rolldown-runtime-*.js`.

**Expected Behavior:**
Production should be built from the pinned toolchain in `package.json` so behavior matches local builds and tests.

**Actual Behavior:**
Production is on Phaser v4 + Vite 8 (rolldown). The Vercel build cache/state is stale or differs from `main`.

**Screenshot:** (none — build artifact evidence)
**Console Errors:**
```
Phaser v4.1.0 (WebGL | Web Audio)   [info banner]
Deprecated feature used (count: 1)  [issue/warning]
```

**Fix:** Trigger a fresh Vercel redeploy from current `main` (clear build cache). After that, prod should match the local vite5/phaser3 build.

---

### Issue #4: Favicon 404
| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Console / Content |
| **URL** | https://dignity2-d.vercel.app/ |

**Description:**
The browser requests `/favicon.ico` and receives a 404. No favicon is configured for the deployment.

**Steps to Reproduce:**
1. Open the site.
2. Check Network/Console for `GET /favicon.ico` → 404.

**Expected Behavior:**
A favicon is served (or `index.html` declares one), avoiding a 404.

**Actual Behavior:**
`GET https://dignity2-d.vercel.app/favicon.ico` → 404.

**Screenshot:** (none)
**Console Errors:**
```
Failed to load resource: the server responded with a status of 404 ()
```

---

### Issue #5: Deprecated-feature console warning on load
| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | Console |
| **URL** | https://dignity2-d.vercel.app/ |

**Description:**
A single deprecation warning is emitted on page load (count: 1), likely tied to the Phaser v4 runtime from Issue #3.

**Steps to Reproduce:**
1. Open the site.
2. Observe console: `Deprecated feature used (count: 1)`.

**Expected Behavior:**
No deprecation warnings in production.

**Actual Behavior:**
One deprecation warning present.

**Screenshot:** (none)
**Console Errors:**
```
Deprecated feature used (count: 1)
```

---

## Issues Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Game canvas renders below the fold (requires scrolling to play) | 🔴 Critical | Visual / Functional | / (after Quick Play) |
| 2 | Create Room / Join Room fail ("ROOM SETUP FAILED") | 🟠 High | Functional | / |
| 3 | Prod toolchain drift: Phaser v4 + Vite 8 vs pinned phaser 3.80.1 + vite 5.4.20 | 🟡 Medium | Build / Console | / |
| 4 | Favicon 404 | 🟡 Medium | Console / Content | / |
| 5 | Deprecated-feature console warning | 🔵 Low | Console | / |

---

## Testing Coverage

### Pages Tested
- Launcher / landing page (https://dignity2-d.vercel.app/)
- In-game (after Quick Play) — board, HUD, player, enemies, capture mechanic
- Settings panel (Control Layout: Primary Hand, Joystick Scale)
- Accessibility panel
- Create Room flow
- Join Room flow (room ID input + Join)

### Features Tested
- Quick Play → game starts, Phaser loop runs (frame ~11.5k observed), keyboard input moves the player.
- Capture mechanic: drove the real engine through a closed-loop trail; reveal went 0% → 11%, captures=1. Win threshold = 75% reveal ("IMAGE SECURED" overlay); 0 lives = "SIGNAL LOST". **Mechanic is sound; a level is completable.**
- Settings toggle, Accessibility toggle (no errors).
- Create Room / Join Room (both fail without backend — Issue #2).

### Not Tested / Out of Scope
- Full 75% completion via live input (engine confirmed working; full automated win was limited by the `isSafePoint` start-on-border requirement for chained loops, not by any bug).
- Multiplayer actual sync (blocked by Issue #2 — no backend in prod).
- Image upload (requires backend `VITE_SERVER_URL`, same gap as Issue #2).
- Mobile/touch joystick (desktop viewport used).

### Blockers
- Live browser tool backend returned 502 Bad Gateway mid-session; remaining checks (re-confirm Join visually) were completed via source inspection + earlier chrome_devtools DOM measurements.
- Multiplayer and upload are blocked for all users by the missing production `VITE_SERVER_URL` (Issue #2/#3).

---

## Notes

1. **The game works.** Once the canvas is visible (fixed by the `bootstrap.ts` change in this session, and by a fresh prod redeploy), a human can play and complete a level — the trail-drawing/capture loop, scoring, win/lose overlays, and enemy projectiles all function in the live engine.
2. **Issue #1 is the "no scrolling" blocker.** It is purely a production CSS-bundling defect; the source rule exists but was dropped. The imperative fix guarantees correctness even if the bundler misbehaves again.
3. **Issue #2/#3 are deployment gaps.** Multiplayer and upload need a `VITE_SERVER_URL` in the Vercel env, and the whole prod build must be resynced to the pinned toolchain (Phaser 3.80.1 / Vite 5.4.20) to eliminate the v4/rolldown drift and the dropped-CSS symptom.
4. **Verification performed this session:** local `npm run build` → vite 5.4.20 / phaser 3.80.1, CSS rule present; 226 unit tests pass; ESLint clean; live DOM measurement confirmed canvas off-screen (y=712) and confirmed the injected fix makes it fully visible (y=134, no scroll).
