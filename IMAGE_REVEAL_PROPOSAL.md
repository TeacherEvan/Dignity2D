## Image-Reveal Feature — Design Proposal (pending user confirmation)
Generated: 2026-08-27 | Status: PROPOSAL (not implemented; awaiting answers to 5 clarification points)

Context: user asked to "add images manually" for background reveal on level completion, push to GitHub, and have user cache remember discovered images (no repeats).

### Default design (most conservative, least invention)
Assumes answers if user does NOT override:
- SOURCE: A. repo folder (`public/discovered-images/`) — push via git.
- PERSISTENCE: A. `localStorage` (`dignity2d-discovered` key = JSON array of completed image filenames/UUIDs), per-user, no server.
- REVEAL LOCATION: A. replace/overlay `GameScene.drawBackground()` (line ~1130 area) — the discovered image feeds into the background layer.
- NON-REPEAT KEY: assigned UUID/index per image (not level-linked) — stored in manifest `public/discovered-images/manifest.json`.
- VISUAL: B. gradient kept + image overlay at reduced opacity (safest; doesn't destroy existing design work from GameScene adjustments I just preserved); A (full replace) available on request.

### Files affected (if approved with defaults)
- NEW: `public/discovered-images/` (git-tracked image folder)
- NEW: `public/discovered-images/manifest.json` (list: [{id, filename, levelUnlock}])
- MOD: `src/scenes/GameScene.ts` — `drawBackground()` to load selected undiscovered image; integration with localStorage set
- NEW (optional): `src/discovery/store.ts` — helper: load from localStorage, filter completed, pick next, save discovered
- NO `.env` change; NO auth; NO server change (vanilla ES module repo, no user DB).

### Non-repeat logic (default)
1. On `startGameSession` / scene create, read `localStorage.getItem('dignity2d-discovered')`.
2. Load manifest; filter out any `id` in the completed set.
3. Pick first undiscovered (or random from remaining) → pass to `drawBackground()`.
4. On level completion event, `add discovered-image-id` to localStorage set; save back.
5. Next game/session skips that id (never repeats).

### Open clarifications (user didn't respond; using conservative defaults above; say "A/B/C + override" to change any)
1. Image source (repo / URL / both)? Default = A (repo).
2. Storage (localStorage / IndexedDB / server)? Default = A (localStorage).
3. Reveal site (replace drawBackground / overlay / new reveal screen)? Default = A (replace/overlay drawBackground).
4. Non-repeat key (filename / UUID / level)? Default = UUID + manifest.
5. Visual mode (replace gradient / overlay / progressive collage)? Default = B (gradient + overlay).

### Gate reminder
This is PROPOSAL only. Per Phase-4 discipline: fix_summary.md written; design doc here; NO code changes applied beyond proposal file until user approves which option (or confirms defaults) and specifies image files/manifests to commit. Then I'll implement, verify gates, and commit only explicit paths.
