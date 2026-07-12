import type Phaser from "phaser";
import type { GameLaunchData } from "./session";
import { setPendingLaunchData } from "./session";

let gameInstance: Phaser.Game | null = null;

/**
 * Pin the Phaser canvas to the viewport so the play surface is never pushed
 * below the launcher or below the fold. This is done imperatively because the
 * equivalent `#game-container { position: fixed; inset: 0 }` rule in
 * `game-container.css` can be dropped by some production bundlers (observed on
 * a Vercel deploy where the CSS rule failed to ship, leaving the canvas
 * off-screen and requiring a scroll to play).
 */
function ensureInGameLayout(): void {
  const styleId = "dignity-ingame-layout";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    html, body { height: 100%; overflow: hidden; }
    #game-container {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 0 !important;
      overflow: hidden !important;
    }
    #app-shell { position: relative !important; z-index: 1 !important; }
    #launcher-shell { display: none !important; }
  `;
  document.head.appendChild(style);
}

export async function startGameSession(
  data: GameLaunchData,
): Promise<Phaser.Game> {
  setPendingLaunchData(data);
  ensureInGameLayout();

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

  const { resolveRuntimeViewport } = await import("./game/config");
  const viewport = resolveRuntimeViewport(data.layoutId);
  gameInstance.scale.resize(viewport.width, viewport.height);

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
