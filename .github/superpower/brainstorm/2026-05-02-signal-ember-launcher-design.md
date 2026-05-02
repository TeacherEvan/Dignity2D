# Design: Signal Ember Launcher Animation
**Date:** 2026-05-02
**Status:** Approved
**Scope Tier:** Production
**Author:** Brainstorm session with user

## Problem Statement
The current Dignity2D launcher is readable and functional, but it does not yet carry much ambient tension or identity before Phaser loads. The goal is to add a restrained animation layer that makes the launcher feel alive, slightly uneasy, and native to the game's tone without hurting scanability or startup cost.

## Success Metrics
- [ ] First-load impression feels more intentional without reducing welcome-screen readability.
- [ ] Launcher actions remain easy to scan on desktop and mobile.
- [ ] Reduced-motion users receive a stable, non-animated fallback.
- [ ] The effect adds no meaningful startup complexity beyond lightweight DOM/CSS behavior.

## Constraints
| Category | Constraint | Source |
|----------|-----------|--------|
| Technical | Keep the launcher/runtime split intact and avoid pulling Phaser into launcher effects | Repo architecture |
| UX | Motion must stay calm, low-density, and easy to scan | Project instructions + user preference |
| Performance | Prefer CSS opacity/transform effects over heavier runtime animation systems | Production scope |
| Visual | Stay within the existing void, gold, sand, and cyan palette, with amber used sparingly | Existing welcome screen and theme |

## Design

### Architecture Overview
Add a launcher-only ambient motion layer inside the existing DOM welcome shell. The effect should remain CSS-first and localized to launcher markup so it can be removed or tuned without touching Phaser scene startup.

### Components
- A near-static card-adjacent glow state that gives the launcher a resting tension.
- Interaction-linked ember cues on key controls such as Quick Play, room controls, upload trigger, and status text.
- A reduced-motion fallback that preserves static glow styling without animation.

### Data Flow
The animation has no gameplay data dependency. It responds only to launcher-local interaction and state changes:
- Idle state: mostly still, with rare localized ember events.
- Hover/focus state: slightly sharper localized glow near the active control.
- Status change state: brief amber residue near the status line, then decay back to idle.

### Motion Language
The selected direction is `Signal ember`.

Core feel:
- Sparse, low-intensity embers around control surfaces.
- Faint cyan charge near actionable elements.
- Soft amber residue that lingers briefly after interaction or status change.
- Long quiet gaps between events to preserve dignity and tension.

Emotional target:
- “Something fragile is still alive.”
- Not a boot sequence.
- Not a promotional hero animation.
- Not a generic neon sci-fi treatment.

### Error Handling
- If reduced motion is requested, disable animation and keep static glow states only.
- If the animation layer fails to mount or styles do not load, the launcher should remain fully functional and visually coherent without it.

## Alternatives Considered
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|-------------|
| Veil drift | Strong background atmosphere with little UI coupling | Too ambient for the preferred direction | User preferred more UI-linked motion |
| Threat perimeter | More game-native territorial tension | Higher risk of visual competition around the shell | Too perimeter-heavy for a calm launcher |
| Signal ember | Fits compact launcher UI, low complexity, interaction-aware | Requires careful restraint to avoid visual noise | Selected |

## Risk Analysis
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|-----------|-------|
| Motion competes with calm copy and scanability | Medium | High | Only one noticeable event at a time; no motion under body copy | Implementation |
| Launcher gains startup cost or complexity | Low | High | Keep effect DOM/CSS-only; avoid canvas or Phaser | Implementation |
| Visual tone drifts into generic sci-fi chrome | Medium | Medium | Use existing palette and sparse amber accents only | Design |
| Mobile feels busy | Medium | Medium | Allow only one simultaneous event and reduce event frequency on smaller devices | Implementation |

## Complexity Budget
| Element | Cost Level | Justification |
|---------|-----------|---------------|
| Launcher-local CSS animation layer | Low | Reuses existing DOM shell and avoids new runtime systems |
| Interaction-linked glow states | Low | Extends existing launcher controls without new abstractions |
| Reduced-motion fallback | Low | Straightforward guardrail for accessibility |
**Total complexity:** Within budget for Production scope.

## Rollback Plan
- **Before launch:** Remove the launcher animation layer and related styles.
- **After launch:** Gate motion behind a simple class or feature toggle and disable it if readability or performance regress.
- **Data recovery:** Not applicable; no persisted data is introduced.

## What This Design Does NOT Do
- Does NOT redesign the launcher layout or copy.
- Does NOT add a full-screen cinematic background.
- Does NOT use Phaser or canvas-based animation in the launcher.
- Does NOT explain gameplay rules.

## Open Questions
- [ ] Which exact launcher elements should receive the strongest ember response first: Quick Play, status line, or upload trigger?
- [ ] Should idle ember activity be entirely timer-driven or partly linked to existing launcher state transitions?

## Testing Strategy
- Unit tests for presence of the launcher animation layer and reduced-motion fallback behavior.
- DOM-focused checks to confirm buttons and status text remain readable and interactive.
- Manual browser validation for desktop and mobile launcher scanability.
- Visual verification that only one noticeable ember event occurs at a time.