import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";
import {
  awardCaptureScore,
  calculateCaptureScore,
  hasWon,
  WIN_REVEAL_RATIO,
} from "./scoring";

describe("scoring", () => {
  it("wins at exactly 75 percent reveal", () => {
    expect(WIN_REVEAL_RATIO).toBe(0.75);
    expect(hasWon(0.75)).toBe(true);
    expect(hasWon(0.749)).toBe(false);
  });

  it("scores larger and riskier captures higher", () => {
    const small = calculateCaptureScore({
      area: 100,
      dangerMultiplier: 1,
      streak: 0,
      coOpBonus: 0,
    });
    const large = calculateCaptureScore({
      area: 100,
      dangerMultiplier: 2,
      streak: 2,
      coOpBonus: 50,
    });
    expect(large).toBeGreaterThan(small);
  });

  it("awards capture score from pure game state data", () => {
    const state = createInitialGameState("solo-default", 320, 480);
    state.captures = [
      {
        id: "capture-1",
        polygon: [],
        area: 120,
      },
    ];
    state.enemies = [
      {
        id: "enemy-1",
        kind: "chaser",
        position: { x: 10, y: 10 },
        velocity: { x: 0, y: 0 },
      },
      {
        id: "enemy-2",
        kind: "chaser",
        position: { x: 20, y: 20 },
        velocity: { x: 0, y: 0 },
      },
    ];
    state.revealedRatio = 0.8;

    const next = awardCaptureScore(state, "p1", 120);

    expect(next.players[0]?.score).toBe(169);
    expect(next.won).toBe(true);
  });
});
