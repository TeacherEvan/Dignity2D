import type Phaser from "phaser";
import { getPendingLaunchData } from "../session";

type PhaserRuntime = typeof Phaser;

export function resolveRuntimeViewport(layoutId?: string): {
  width: number;
  height: number;
} {
  switch (layoutId) {
    case "desktop-standard":
      return { width: 960, height: 720 };
    case "portrait-tablet-standard":
      return { width: 768, height: 1024 };
    case "landscape-tablet-standard":
      return { width: 1024, height: 768 };
    case "landscape-phone-standard":
      return { width: 844, height: 390 };
    default:
      return { width: 390, height: 844 };
  }
}

export async function createGameConfig(
  runtime: PhaserRuntime,
): Promise<Phaser.Types.Core.GameConfig> {
  // Scene code stays deferred until a session actually starts.
  const { GameScene } = await import("../scenes/GameScene");
  const viewport = resolveRuntimeViewport(getPendingLaunchData().layoutId);

  return {
    type: runtime.WEBGL,
    parent: "game-container",
    backgroundColor: "#0A0812",
    width: viewport.width,
    height: viewport.height,
    scale: {
      mode: runtime.Scale.FIT,
      autoCenter: runtime.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      antialiasGL: true,
      powerPreference: "high-performance",
    },
    scene: [GameScene],
  };
}
