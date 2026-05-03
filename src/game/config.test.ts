import { describe, expect, it, vi } from "vitest";

const sceneState = vi.hoisted(() => ({
  GameScene: class GameScene {},
}));

vi.mock("../scenes/GameScene", () => ({
  GameScene: sceneState.GameScene,
}));

import { createGameConfig } from "./config";
import { setPendingLaunchData } from "../session";

describe("createGameConfig", () => {
  it("builds a Phaser config around the lazily imported GameScene", async () => {
    setPendingLaunchData({ layoutId: "portrait-phone-standard" });
    const runtime = {
      WEBGL: "WEBGL",
      Scale: {
        FIT: "FIT",
        CENTER_BOTH: "CENTER_BOTH",
      },
    } as const;

    const config = await createGameConfig(runtime as never);

    expect(config.type).toBe("WEBGL");
    expect(config.parent).toBe("game-container");
    expect(config.scale).toEqual({
      mode: "FIT",
      autoCenter: "CENTER_BOTH",
    });
    expect(config.scene).toEqual([sceneState.GameScene]);
  });

  it("derives viewport size from the pending launch layout", async () => {
    setPendingLaunchData({ layoutId: "desktop-standard" });

    const runtime = {
      WEBGL: "WEBGL",
      Scale: {
        FIT: "FIT",
        CENTER_BOTH: "CENTER_BOTH",
      },
    } as const;

    const config = await createGameConfig(runtime as never);

    expect(config.width).toBe(960);
    expect(config.height).toBe(720);
  });
});
