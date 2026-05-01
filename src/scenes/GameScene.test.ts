import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
  },
}));

import {
  advanceGameState,
  BOARD_SIZE,
  createSceneGameState,
} from "./GameScene";

describe("GameScene helpers", () => {
  it("seeds a playable solo state with an enemy wave", () => {
    const state = createSceneGameState();

    expect(state.imageSize).toEqual(BOARD_SIZE);
    expect(state.players[0]?.id).toBe("p1");
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("commits closed trails into capture progress and score", () => {
    const state = createSceneGameState();
    state.players[0] = {
      ...state.players[0],
      position: { x: 40, y: 40 },
      lastSafePosition: { x: 0, y: 10 },
      mode: "drawing",
      activeTrail: {
        playerId: "p1",
        startedAt: 0,
        points: [
          { x: 0, y: 10 },
          { x: 40, y: 10 },
          { x: 40, y: 40 },
        ],
      },
    };

    const completed = advanceGameState(state, {
      direction: { x: -1, y: -0.75 },
      deltaMs: 250,
      now: 250,
    });

    expect(completed.captures.length).toBe(1);
    expect(completed.revealedRatio).toBeGreaterThan(0);
    expect(completed.players[0]?.score).toBeGreaterThan(0);
  });

  it("cancels an active trail when an enemy crosses it", () => {
    const state = createSceneGameState();
    state.players[0] = {
      ...state.players[0],
      position: { x: 40, y: 40 },
      lastSafePosition: { x: 0, y: 0 },
      mode: "drawing",
      activeTrail: {
        playerId: "p1",
        startedAt: 0,
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 80 },
        ],
      },
    };
    state.enemies = [
      {
        id: "enemy-1",
        kind: "chaser",
        position: { x: 42, y: 42 },
        velocity: { x: 0, y: 0 },
      },
    ];

    const next = advanceGameState(state, {
      direction: { x: 0, y: 0 },
      deltaMs: 16,
      now: 16,
    });

    expect(next.players[0]?.activeTrail).toBeNull();
    expect(next.players[0]?.position).toEqual({ x: 0, y: 0 });
  });
});
