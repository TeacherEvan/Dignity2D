---
description: "Use when editing Phaser scenes, Phaser-adjacent rendering or shader modules, or their Vitest coverage. Covers jsdom-safe Phaser mocking and deterministic test patterns for scene, render, and theme work."
applyTo: "src/scenes/**/*.ts,src/render/**/*.ts,src/theme/**/*.ts,src/scenes/**/*.test.ts,src/render/**/*.test.ts,src/theme/**/*.test.ts"
---

# Phaser Testing Guidelines

- Treat Phaser as the integration edge. Keep gameplay, scoring, capture, and progression rules testable outside Phaser classes whenever possible.
- In Vitest and jsdom-based tests, mock `phaser` when the test only needs class shapes, pipelines, or exported constants. Do not depend on a real canvas runtime for helper, shader-string, or scene-shape tests.
- Prefer testing pure helpers exported alongside scene modules over driving a live Phaser scene unless the task specifically requires runtime wiring coverage.
- Keep tests deterministic: fixed inputs, fixed timestamps, no timing races, and no dependency on browser rendering behavior.
- When touching shader or post-processing code, assert stable source characteristics or config behavior rather than pixel-perfect rendering in unit tests.
- If a change pushes non-visual game rules into a scene file, consider moving that logic into a framework-light module first so it can be tested without Phaser.