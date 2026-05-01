import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const phaserState = vi.hoisted(() => {
  const sceneStart = vi.fn();
  const destroy = vi.fn();
  const instances: Array<{
    config: unknown;
    scene: { start: typeof sceneStart };
    destroy: typeof destroy;
  }> = [];

  const Game = vi.fn(function FakeGame(
    this: {
      config: unknown;
      scene: { start: typeof sceneStart };
      destroy: typeof destroy;
    },
    config: unknown,
  ) {
    this.config = config;
    this.scene = { start: sceneStart };
    this.destroy = destroy;
    instances.push(this);
  });

  return { Game, destroy, instances, sceneStart };
});

const configState = vi.hoisted(() => ({
  createGameConfig: vi.fn(async () => ({
    parent: "game-container",
    scene: [],
  })),
}));

vi.mock("phaser", () => ({
  default: {
    Game: phaserState.Game,
  },
}));

vi.mock("./game/config", () => ({
  createGameConfig: configState.createGameConfig,
}));

import { startGameSession, stopGameSession } from "./bootstrap";
import { getPendingLaunchData } from "./session";

describe("bootstrap", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container">occupied</div>';
    phaserState.Game.mockClear();
    phaserState.sceneStart.mockClear();
    phaserState.destroy.mockClear();
    phaserState.instances.length = 0;
    configState.createGameConfig.mockClear();
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
    expect(phaserState.instances[0]).toBe(game);
    expect(getPendingLaunchData()).toEqual(nextLaunch);
  });

  it("destroys the running instance and clears the game container", async () => {
    await startGameSession({ imageId: "img-1" });

    stopGameSession();

    expect(phaserState.destroy).toHaveBeenCalledWith(true);
    expect(document.querySelector("#game-container")?.innerHTML).toBe("");
  });
});
