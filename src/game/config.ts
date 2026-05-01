import type Phaser from "phaser";

type PhaserRuntime = typeof Phaser;

export async function createGameConfig(
  runtime: PhaserRuntime,
): Promise<Phaser.Types.Core.GameConfig> {
  // Scene code stays deferred until a session actually starts.
  const { GameScene } = await import("../scenes/GameScene");

  return {
    type: runtime.WEBGL,
    parent: "game-container",
    backgroundColor: "#0A0812",
    width: 390,
    height: 844,
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
