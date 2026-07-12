import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const phaserState = vi.hoisted(() => {
  const sceneStart = vi.fn();
  const destroy = vi.fn();
  const resize = vi.fn();
  const instances: Array<{
    config: unknown;
    scene: { start: typeof sceneStart };
    scale: { resize: typeof resize };
    destroy: typeof destroy;
  }> = [];

  const Game = vi.fn(function FakeGame(
    this: {
      config: unknown;
      scene: { start: typeof sceneStart };
      scale: { resize: typeof resize };
      destroy: typeof destroy;
    },
    config: unknown,
  ) {
    this.config = config;
    this.scene = { start: sceneStart };
    this.scale = { resize };
    this.destroy = destroy;
    instances.push(this);
  });

  return { Game, destroy, instances, resize, sceneStart };
});

const configState = vi.hoisted(() => ({
  createGameConfig: vi.fn(async () => ({
    parent: "game-container",
    scene: [],
    width: 390,
    height: 844,
  })),
  resolveRuntimeViewport: vi.fn((layoutId?: string) =>
    layoutId === "desktop-standard"
      ? { width: 960, height: 720 }
      : { width: 390, height: 844 },
  ),
}));

vi.mock("phaser", () => ({
  default: {
    Game: phaserState.Game,
  },
}));

vi.mock("./game/config", () => ({
  createGameConfig: configState.createGameConfig,
  resolveRuntimeViewport: configState.resolveRuntimeViewport,
}));

import { startGameSession, stopGameSession } from "./bootstrap";
import { getPendingLaunchData } from "./session";

describe("bootstrap", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container">occupied</div>';
    phaserState.Game.mockClear();
    phaserState.sceneStart.mockClear();
    phaserState.destroy.mockClear();
    phaserState.resize.mockClear();
    phaserState.instances.length = 0;
    configState.createGameConfig.mockClear();
    configState.resolveRuntimeViewport.mockClear();
  });

  afterEach(() => {
    stopGameSession();
    document.body.innerHTML = "";
  });

  it("lazy-loads Phaser config only on the first game start", async () => {
    const firstLaunch = { imageId: "img-1", roomId: "room-1" };

    const game = await startGameSession(firstLaunch);

    expect(configState.createGameConfig).toHaveBeenCalledTimes(1);
    expect(phaserState.Game).toHaveBeenCalledTimes(1);
    expect(phaserState.instances[0]).toBe(game);
    expect(getPendingLaunchData()).toEqual(firstLaunch);
  });

  it("reuses the existing game instance and restarts GameScene with fresh data", async () => {
    await startGameSession({ imageId: "img-1", roomId: "room-1" });

    const nextLaunch = { imageId: "img-2", roomId: "room-2", stateVersion: 3 };
    const game = await startGameSession(nextLaunch);

    expect(configState.createGameConfig).toHaveBeenCalledTimes(1);
    expect(phaserState.Game).toHaveBeenCalledTimes(1);
    expect(phaserState.sceneStart).toHaveBeenCalledWith(
      "GameScene",
      nextLaunch,
    );
    expect(phaserState.resize).toHaveBeenCalledWith(390, 844);
    expect(phaserState.instances[0]).toBe(game);
    expect(getPendingLaunchData()).toEqual(nextLaunch);
  });

  it("resizes the existing game instance when the next launch uses a different layout viewport", async () => {
    await startGameSession({
      imageId: "img-1",
      layoutId: "portrait-phone-standard",
    });

    await startGameSession({ imageId: "img-2", layoutId: "desktop-standard" });

    expect(configState.createGameConfig).toHaveBeenCalledTimes(1);
    expect(configState.resolveRuntimeViewport).toHaveBeenCalledWith(
      "desktop-standard",
    );
    expect(phaserState.resize).toHaveBeenCalledWith(960, 720);
  });

  it("destroys the running instance and clears the game container", async () => {
    await startGameSession({ imageId: "img-1" });

    stopGameSession();

    expect(phaserState.destroy).toHaveBeenCalledWith(true);
    expect(document.querySelector("#game-container")?.innerHTML).toBe("");
  });
});
