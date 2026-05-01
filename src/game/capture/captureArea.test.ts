import { describe, expect, it } from "vitest";
import { calculatePolygonArea, commitCaptureFromTrail } from "./captureArea";
import { createInitialGameState } from "../types";

describe("capture area", () => {
  it("calculates rectangle area", () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(calculatePolygonArea(polygon)).toBe(200);
  });

  it("commits closed trail as capture", () => {
    const state = createInitialGameState("level", 100, 100);
    const trail = {
      playerId: "p1",
      startedAt: 0,
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ],
    };
    const next = commitCaptureFromTrail(state, trail);
    expect(next.captures).toHaveLength(1);
    expect(next.captures[0].area).toBe(400);
    expect(next.revealedRatio).toBeCloseTo(0.04);
  });

  it("rejects open trails", () => {
    const state = createInitialGameState("level", 100, 100);
    const trail = {
      playerId: "p1",
      startedAt: 0,
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
      ],
    };
    expect(commitCaptureFromTrail(state, trail)).toBe(state);
  });
});
