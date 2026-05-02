import { describe, expect, it } from "vitest";
import { deriveHudFeedback, type HudSnapshot } from "./HudFeedback";

function makeSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return {
    score: 0,
    revealedRatio: 0,
    statusText: "Border Camp",
    captureCount: 0,
    won: false,
    ...overrides,
  };
}

describe("deriveHudFeedback", () => {
  it("returns no cue on the first HUD snapshot", () => {
    expect(deriveHudFeedback(null, makeSnapshot())).toEqual({
      pulseReveal: false,
      pulseScore: false,
      pulseStatus: false,
      captureCue: false,
    });
  });

  it("emits reveal, score, and capture cues when territory is secured", () => {
    const previous = makeSnapshot({
      score: 120,
      revealedRatio: 0.18,
      statusText: "Border Camp",
      captureCount: 1,
    });
    const next = makeSnapshot({
      score: 260,
      revealedRatio: 0.29,
      statusText: "Safe Quarter",
      captureCount: 2,
    });

    expect(deriveHudFeedback(previous, next)).toEqual({
      pulseReveal: true,
      pulseScore: true,
      pulseStatus: true,
      captureCue: true,
    });
  });

  it("treats a win-state transition as a status and capture cue", () => {
    const previous = makeSnapshot({
      score: 520,
      revealedRatio: 0.74,
      statusText: "Safe Quarter",
      captureCount: 4,
      won: false,
    });
    const next = makeSnapshot({
      score: 520,
      revealedRatio: 0.74,
      statusText: "Image secured",
      captureCount: 4,
      won: true,
    });

    expect(deriveHudFeedback(previous, next)).toEqual({
      pulseReveal: false,
      pulseScore: false,
      pulseStatus: true,
      captureCue: true,
    });
  });

  it("does not retrigger cues when values stay the same or decrease", () => {
    const previous = makeSnapshot({
      score: 180,
      revealedRatio: 0.31,
      statusText: "Safe Quarter",
      captureCount: 2,
    });
    const next = makeSnapshot({
      score: 180,
      revealedRatio: 0.3,
      statusText: "Safe Quarter",
      captureCount: 2,
    });

    expect(deriveHudFeedback(previous, next)).toEqual({
      pulseReveal: false,
      pulseScore: false,
      pulseStatus: false,
      captureCue: false,
    });
  });
});