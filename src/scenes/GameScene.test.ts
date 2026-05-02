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
  makeGameStatusText,
  makeSceneLaunchData,
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

  it("reports solo and multiplayer status labels without leaking image URLs", () => {
    expect(
      makeGameStatusText(
        {
          roomId: undefined,
          imageId: "default-image",
          imageUrl: "https://private.test/img",
        },
        false,
        0,
        "Border Camp",
      ),
    ).toBe("Image default-image");
    expect(
      makeGameStatusText(
        {
          roomId: "room-1",
          imageId: "img-1",
          imageUrl: "https://private.test/img",
        },
        false,
        0,
        "Border Camp",
      ),
    ).toBe("Room room-1");
  });

  it("shows secured status when the game is won", () => {
    expect(makeGameStatusText({}, true, 2, "Image Secured")).toBe(
      "Image secured",
    );
  });

  it("falls back to territory stage before enemy count", () => {
    expect(makeGameStatusText({}, false, 3, "Safe Quarter")).toBe(
      "Safe Quarter",
    );
  });

  it("applies persisted layout id to scene launch data", () => {
    const launchData = makeSceneLaunchData({
      imageId: "img-1",
      layoutId: "portrait-phone-standard",
    });
    expect(launchData.layoutId).toBe("portrait-phone-standard");
  });
});
