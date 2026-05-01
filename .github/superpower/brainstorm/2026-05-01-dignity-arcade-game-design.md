# Design: Dignity Arcade Game
**Date:** 2026-05-01
**Status:** Approved
**Scope Tier:** Production
**Author:** Brainstorm session with user

## Problem Statement
Dignity Arcade Game is a mobile web arcade territory-reveal game for challenge-focused players. Players control a line monster on the border of a hidden uploaded image, leave the safe border to draw capture trails, and reveal enclosed areas while aliens attack. The game supports solo play and online co-op, with a shared goal of revealing 75% of the image.

The production design should deliver tight mobile controls, stable online rooms, privacy-conscious image upload handling, replayable progression, and a strong arcade challenge loop.

## Success Metrics
- [ ] Movement, trail drawing, capture completion, and collision feel responsive on mobile.
- [ ] Modern phones target 60 FPS, with graceful 30 FPS fallback and performance mode.
- [ ] Online rooms can be created, joined, synchronized, and recovered after short disconnects.
- [ ] The 75% reveal win condition is consistently detected across solo and co-op play.
- [ ] Uploaded images can be resized, used in a room, retained by explicit setting, and deleted from settings.
- [ ] Ranked scoring remains fair through normalized competitive templates.
- [ ] Players understand safe borders, active trails, and co-op roles without long instructions.

## Constraints
| Category | Constraint | Source |
|----------|------------|--------|
| Platform | First release targets mobile web. | User choice |
| Multiplayer | Online co-op is required for the production design. | User choice |
| Controls | Mobile virtual joystick is the primary input model. | User choice |
| Images | Players can upload images. Retention is configurable with best-practice privacy settings. | User choice |
| Audience | Designed for arcade challenge fans. | User choice |
| Access | Guest rooms should remain fast and account-free unless later expanded. | User choice |
| Priority | Tight gameplay feel is the highest production priority. | User choice |
| Technology | No user preference; choose best fit. | User choice |

## Design

### Architecture Overview
Use Phaser + TypeScript with Vite for the mobile web client, backed by a Node.js service layer. Phaser handles rendering, scene management, input, animation, masking, collisions, audio, and responsive mobile gameplay. The backend owns guest rooms, WebSocket synchronization, capture validation, scoring, leaderboards, upload processing, retention settings, moderation hooks, telemetry, and room recovery.

The app opens to a dedicated home menu with Play, Join Room, Upload Image, Build, Leaderboards, Settings, Accessibility, Audio, Privacy, and Controls.

### Core Gameplay
Each level starts with a hidden image covered by a mask. Players begin on a safe outer border. They can leave the border to draw an active trail, then reconnect to the safe border or an existing captured edge to reveal the enclosed area. The win condition is revealing 75% of the image.

If an alien projectile hits a player or an unfinished trail, that active trail is cancelled and the player returns to the last confirmed safe border position. Completed captures award points based on area size, danger, co-op contribution, timing, and streaks.

### Co-op Gameplay
Co-op is central. Both players reveal the same hidden image together. Each player can draw independent capture trails, but the strongest scoring comes from coordinated captures: enclosing areas from opposite sides, protecting a teammate's active trail, or linking two unfinished trails into one larger completed capture.

Enemy pressure reacts to teamwork. If both players leave the border at once, aliens become more aggressive, creating a risk-reward decision. If one player stays on the safe border, they can collect support power-ups, draw enemy fire, or use defensive abilities while the other player captures territory.

### Networking Model
Networking uses room-authoritative state with client-side prediction. Players see their own movement immediately. The server confirms captures, enemy seeds, score, damage, power-up spawns, reveal masks, and win state.

The client smooths teammate movement, shows latency status, and pauses ranked scoring if connection quality drops too far. Reconnects restore the last confirmed safe position, active build, score, reveal mask, and room state. If a player disconnects, the room can pause briefly, continue solo, or invite a replacement depending on mode settings.

### Upload And Privacy Model
Uploaded images are processed by the backend before use. Processing includes size limits, format validation, resizing, compression, content safety hooks, metadata stripping, and storage according to the selected retention setting.

Retention is configurable with privacy-first defaults. Session-only retention is the default. Players can explicitly choose longer retention when supported. Saved images need clear expiration controls, deletion options, and visibility rules. Uploads are not public unless the player intentionally creates a shareable room link.

### Enemy And Level Systems
Levels scale difficulty through enemy count, projectile speed, alien behavior, capture target pressure, and image complexity. Enemy types must be readable on small screens:

- Chasers pressure players near active trails.
- Shooters fire predictable projectile lanes.
- Orbiters guard high-value areas.
- Disruptors temporarily disable power-ups or shrink safe timing windows.

Enemy behavior should force different builds and co-op choices rather than only increasing speed.

### Power-ups And RPG Progression
The production design uses deep builds with classes, skill trees, gear, and co-op synergies. Players choose a class, unlock branching talents, equip a gadget, choose passive chips, and customize trail effects that can alter gameplay.

Classes include Guardian, Striker, Scout, Engineer, and Trickster. Gear examples include shield cores, dash engines, scanner lenses, repair modules, lure transmitters, and score amplifiers.

Co-op builds can intentionally pair together:

- Guardian protects trails.
- Scout exposes safer capture routes.
- Engineer repairs or extends captures.
- Striker clears enemies.
- Trickster redirects attacks.

Ranked mode uses normalized competitive templates. Casual and private rooms can allow full build power, custom difficulty, and progression advantages. Endgame includes challenge tiers, seasonal modifiers, rare cosmetic drops, mastery badges, and build presets from the home menu.

### Mobile UX
The first screen is the playable home menu, not a marketing page. It includes large touch targets for Quick Play, Create Room, Join Room, Solo Run, Build, Upload, Leaderboards, Settings, and Accessibility.

The game screen uses a stable portrait-first layout: joystick on the lower left, one active ability on the lower right, compact teammate status, reveal percentage, score, health, and warning indicators near the playfield edge.

Settings include control sensitivity, joystick size, handedness, reduced motion, color contrast, audio levels, haptics, upload retention, privacy, and data deletion. Text should stay calm and short so the arcade screen remains readable under pressure.

### Performance Design
The game targets 60 FPS on modern phones with a 30 FPS fallback. Performance protections include a performance mode, compressed uploads, pooled enemies and projectiles, capped particles, fixed mask resolution, simple collision shapes, lazy-loaded audio, and adaptive visual effects for lower-end devices.

## Alternatives Considered
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Phaser + TypeScript | Strong 2D game support, mobile input, scenes, asset loading, production speed. | Adds engine dependency. | Selected as best balance for production scope. |
| PixiJS custom game loop | Excellent rendering control and flexibility. | More custom gameplay infrastructure, input, scene, and collision work. | Higher complexity for limited benefit. |
| Plain Canvas + TypeScript | Maximum control and minimal dependencies. | Highest implementation burden for rendering, input, masks, effects, and tooling. | Too much custom engine work for a production game. |
| Client-only prototype first | Fastest way to test the mechanic. | Does not address online co-op, backend validation, or production upload needs. | Useful as a milestone, not the full architecture. |

## Risk Analysis
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Mobile frame rate drops during masking, projectiles, or effects. | High | High | Fixed mask resolution, object pooling, adaptive effects, performance mode, profiling on real devices. | Game engineering |
| Online co-op feels laggy or unfair. | Medium | High | Client-side prediction, server capture validation, smoothing, latency indicators, reconnect recovery. | Backend and gameplay engineering |
| Uploaded images create privacy, storage, or moderation problems. | Medium | High | Session-first retention, explicit save settings, deletion controls, metadata stripping, scanning hooks, size limits. | Backend engineering |
| Deep RPG progression harms competitive fairness. | Medium | Medium | Normalize ranked templates and allow full power only in casual/private rooms. | Game design |
| Production scope becomes too large. | High | High | Stage delivery behind milestones and feature flags. Build solo capture first, then online rooms, uploads, builds, leaderboards, and polish. | Product and engineering |

## Complexity Budget
| Element | Cost Level | Justification |
|---------|------------|---------------|
| Phaser + TypeScript client | Medium | Purpose-built 2D engine reduces custom rendering and input work. |
| Node.js WebSocket backend | High | Required for online co-op, authoritative room state, and reconnects. |
| Uploaded image processing and retention | High | Needed for user-uploaded levels with privacy controls. |
| Server-validated territory capture | High | Required for fair synchronized co-op and scoring. |
| Deep RPG progression | High | Adds replayability but increases design, data, UI, and balancing work. |
| Ranked leaderboard normalization | Medium | Required to keep competitive scoring fair. |

**Total complexity:** High but within a production scope if delivered in staged milestones with feature flags and conservative privacy defaults.

## Rollback Plan
- **Before launch:** Disable unfinished systems through feature flags, revert specific PRs, and fall back to solo/local test modes.
- **After launch:** Disable ranked leaderboards, uploaded-image retention, or RPG build effects independently through server configuration.
- **Networking recovery:** Reconnect players to the last confirmed room state or safely end the room with preserved score summary.
- **Image recovery:** Allow players to delete retained images from settings; expire unclaimed room uploads automatically.
- **Progression recovery:** Keep progression data versioned so broken skill or gear rules can be disabled without deleting player records.

## What This Design Does NOT Do
- Does not require accounts for the first production direction, though accounts can be added later.
- Does not make uploaded images public by default.
- Does not let full RPG progression affect ranked play without normalization.
- Does not define final monetization, store release, or platform packaging beyond mobile web.
- Does not specify final art assets, soundtracks, or exact alien statistics.

## Open Questions
- [ ] Should optional accounts be added before or after the first public release?
- [ ] What retention durations should be offered for uploaded images?
- [ ] What age rating and content moderation policy should guide uploads and chat, if chat is added?
- [ ] Should portrait remain mandatory, or should landscape be supported later?
- [ ] What backend hosting and database should be used?

## Testing Strategy
- Unit tests for capture geometry, trail cancellation, win condition calculation, skill tree rules, scoring, and upload retention settings.
- Integration tests for WebSocket room creation, joining, capture commits, score sync, reconnect recovery, and room expiration.
- Client tests for touch controls, joystick sensitivity, ability activation, accessibility settings, and responsive layout.
- Performance tests on representative mobile devices for masking, particle load, projectile count, enemy count, and uploaded image sizes.
- Security and privacy tests for upload validation, metadata stripping, retention expiry, deletion, and unauthorized room access.
- Playtests focused on whether players understand safe borders, active trails, co-op roles, enemy warnings, and build choices without long instructions.