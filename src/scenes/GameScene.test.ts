import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
  },
}));

import {
  applyRoomStateSyncSnapshot,
  advanceGameState,
  advanceGameStateWithDiagnostics,
  BOARD_SIZE,
  createSceneGameState,
  createSceneGameStateForLaunch,
  getScenePerformanceFallbackReason,
  makeHudSnapshot,
  makeGameStatusText,
  makePreviewLabel,
  makeSceneLaunchData,
  resolveSceneLayoutMetrics,
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

  it("does not score already revealed overlap twice", () => {
    const state = createSceneGameState();
    state.enemies = [];
    state.captures = [
      {
        id: "capture-1",
        polygon: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 },
        ],
        area: 400,
      },
    ];
    state.revealedRatio = 400 / (BOARD_SIZE.width * BOARD_SIZE.height);
    state.players[0] = {
      ...state.players[0],
      position: { x: 10, y: 20 },
      lastSafePosition: { x: 10, y: 10 },
      mode: "drawing",
      score: 50,
      activeTrail: {
        playerId: "p1",
        startedAt: 0,
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 30, y: 20 },
          { x: 10, y: 20 },
        ],
      },
    };

    const completed = advanceGameState(state, {
      direction: { x: 0, y: -0.5 },
      deltaMs: 125,
      now: 125,
    });

    expect(completed.captures).toHaveLength(2);
    expect(completed.captures[1]?.area).toBe(100);
    expect(completed.players[0]?.score).toBe(200);
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
    ).toBe("Signal concealed");
    expect(
      makeGameStatusText(
        {
          roomId: "room-1",
          playerId: "p2",
          imageId: "img-1",
          imageUrl: "https://private.test/img",
          roomPlayerIds: ["p1", "p2"],
          stateVersion: 4,
        },
        false,
        0,
        "Border Camp",
      ),
    ).toBe("Room room-1 · 2 players linked");
  });

  it("keeps multiplayer status steady across sync revisions", () => {
    expect(
      makeGameStatusText(
        {
          roomId: "room-1",
          playerId: "p2",
          roomPlayerIds: ["p1", "p2"],
          stateVersion: 4,
        },
        false,
        0,
        "Border Camp",
      ),
    ).toBe(
      makeGameStatusText(
        {
          roomId: "room-1",
          playerId: "p2",
          roomPlayerIds: ["p1", "p2"],
          stateVersion: 9,
        },
        false,
        0,
        "Border Camp",
      ),
    );
  });

  it("uses a calm waiting status when a room has only one player", () => {
    expect(
      makeGameStatusText(
        {
          roomId: "room-1",
          playerId: "p1",
          roomPlayerIds: ["p1"],
        },
        false,
        0,
        "Border Camp",
      ),
    ).toBe("Room room-1 · Awaiting second player");
  });

  it("uses mystery-first preview labels for default and custom images", () => {
    expect(makePreviewLabel(undefined)).toBe("Concealed image");
    expect(makePreviewLabel("https://private.test/img")).toBe("Chosen image");
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
      motionMode: "reduced",
    });
    expect(launchData.layoutId).toBe("portrait-phone-standard");
    expect(launchData.motionMode).toBe("reduced");
  });

  it("derives runtime board geometry from the resolved layout id", () => {
    const portraitPhone = resolveSceneLayoutMetrics(
      "portrait-phone-standard",
      390,
      844,
    );
    const desktop = resolveSceneLayoutMetrics("desktop-standard", 960, 720);

    expect(portraitPhone.boardSize).toEqual({ width: 342, height: 560 });
    expect(portraitPhone.boardOrigin).toEqual({ x: 24, y: 132 });
    expect(portraitPhone.hudTop).toBe(18);

    expect(desktop.boardSize).toEqual({ width: 720, height: 528 });
    expect(desktop.boardOrigin).toEqual({ x: 120, y: 104 });
    expect(desktop.hudTop).toBe(24);
  });

  it("seeds multiplayer launches with the room player id and no solo enemy wave", () => {
    const state = createSceneGameStateForLaunch(
      {
        roomId: "room-1",
        playerId: "p2",
        roomPlayerIds: ["p1", "p2"],
        stateVersion: 3,
      },
      BOARD_SIZE,
    );

    expect(state.players.map((player) => player.id)).toEqual(["p2", "p1"]);
    expect(state.players[0]?.id).toBe("p2");
    expect(state.enemies).toEqual([]);
  });

  it("applies room sync snapshots to launch data and player state", () => {
    const launchData = {
      roomId: "room-1",
      playerId: "p2",
      imageId: "img-1",
      roomPlayerIds: ["p2"],
      stateVersion: 1,
    };
    const state = createSceneGameStateForLaunch(launchData, BOARD_SIZE);

    const result = applyRoomStateSyncSnapshot(
      state,
      launchData,
      {
        type: "state-sync",
        roomId: "room-1",
        stateVersion: 2,
        imageId: "img-1-live",
        playerIds: ["p1", "p2"],
      },
    );

    expect(result.launchData).toMatchObject({
      imageId: "img-1-live",
      roomPlayerIds: ["p2", "p1"],
      stateVersion: 2,
    });
    expect(result.state.players.map((player) => player.id)).toEqual(["p2", "p1"]);
  });

  it("reports capture and collision diagnostics from frame advancement", () => {
    const captureState = createSceneGameState();
    captureState.players[0] = {
      ...captureState.players[0],
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

    const captureResult = advanceGameStateWithDiagnostics(captureState, {
      direction: { x: -1, y: -0.75 },
      deltaMs: 250,
      now: 250,
    });

    expect(captureResult.events).toEqual([
      {
        name: "capture_committed",
        payload: { revealedRatio: captureResult.state.revealedRatio },
      },
    ]);

    const collisionState = createSceneGameState();
    collisionState.players[0] = {
      ...collisionState.players[0],
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
    collisionState.enemies = [
      {
        id: "enemy-1",
        kind: "chaser",
        position: { x: 42, y: 42 },
        velocity: { x: 0, y: 0 },
      },
    ];

    const collisionResult = advanceGameStateWithDiagnostics(collisionState, {
      direction: { x: 0, y: 0 },
      deltaMs: 16,
      now: 16,
    });

    expect(collisionResult.events).toEqual([
      { name: "trail_cancelled", payload: {} },
      { name: "enemy_collision", payload: { enemyKind: "chaser" } },
    ]);
  });

  it("reports the reduced-motion performance fallback reason", () => {
    expect(getScenePerformanceFallbackReason(true)).toBe("reduced-motion");
    expect(getScenePerformanceFallbackReason(false)).toBeNull();
  });

  it("builds a HUD snapshot from score, captures, and status text", () => {
    const state = createSceneGameState();
    state.players[0] = {
      ...state.players[0],
      score: 240,
    };
    state.revealedRatio = 0.28;
    state.captures = [
      {
        id: "capture-1",
        polygon: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 },
        ],
        area: 400,
      },
    ];

    expect(makeHudSnapshot(state, {})).toEqual({
      score: 240,
      revealedRatio: 0.28,
      statusText: "Safe Quarter",
      captureCount: 1,
      won: false,
    });
  });

  it("uses concealed-image status for an image-backed solo run before progress advances", () => {
    const state = createSceneGameState();

    expect(makeHudSnapshot(state, { imageId: "default-image" })).toEqual({
      score: 0,
      revealedRatio: 0,
      statusText: "Signal concealed",
      captureCount: 0,
      won: false,
    });
  });
});
