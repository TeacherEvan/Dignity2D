import type Phaser from "phaser";
import type { GameLaunchData } from "./session";
import { setPendingLaunchData } from "./session";

let gameInstance: Phaser.Game | null = null;

export async function startGameSession(
  data: GameLaunchData,
): Promise<Phaser.Game> {
  setPendingLaunchData(data);

  if (!gameInstance) {
    // Keep Phaser out of first paint; the launcher requests the runtime on demand.
    const [{ default: Phaser }, { createGameConfig }] = await Promise.all([
      import("phaser"),
      import("./game/config"),
    ]);
    const gameConfig = await createGameConfig(Phaser);
    gameInstance = new Phaser.Game(gameConfig);
    return gameInstance;
  }

  gameInstance.scene.start("GameScene", data);
  return gameInstance;
}

export function stopGameSession(): void {
  if (!gameInstance) {
    return;
  }

  gameInstance.destroy(true);
  gameInstance = null;

  const container = document.querySelector<HTMLElement>("#game-container");
  if (container) {
    container.innerHTML = "";
  }
}
