---
description: "Use when editing launcher copy, welcome-screen text, room and upload status messaging, or other player-facing shell text. Covers calm, low-density UI writing for the launcher and welcome flow."
applyTo: "src/launcher.ts,src/launcher.test.ts,src/welcome/**/*.ts,src/welcome/**/*.test.ts"
---

# UI Copy Guidelines

- Keep launcher and welcome copy calm, low-density, and easy to scan. Prefer short sentences and plain verbs over hype, urgency, or overloaded feature lists.
- Status text should help the player understand the next state quickly. Prefer concise messages such as ready, joining, uploaded, or failed, without extra flourish.
- Action labels should be clear on first read. Prefer direct wording like `Quick Play`, `Create Room`, `Join`, and `Upload Image` over clever or promotional alternatives.
- Avoid leaking unnecessary technical detail into player-facing copy. Do not surface private URLs, raw backend terminology, or verbose diagnostics unless the task explicitly calls for that detail.
- When copy reflects privacy-sensitive flows like uploads or room access, keep the wording factual and reassuring without overstating guarantees.
- If copy grows longer, reduce cognitive load first by simplifying the text before adding more UI structure.