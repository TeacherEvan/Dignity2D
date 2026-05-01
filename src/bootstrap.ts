import Phaser from "phaser";
import { gameConfig } from "./game/config";
import type { GameLaunchData } from "./session";
import { setPendingLaunchData } from "./session";

let gameInstance: Phaser.Game | null = null;

export async function startGameSession(data: GameLaunchData): Promise<Phaser.Game> {
  setPendingLaunchData(data);

  if (!gameInstance) {
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