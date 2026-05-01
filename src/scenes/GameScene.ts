import Phaser from "phaser";
import { createInitialGameState, type GameState } from "../game/types";

export class GameScene extends Phaser.Scene {
  private state!: GameState;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.state = createInitialGameState("solo-default", 320, 480);
    this.add
      .rectangle(195, 360, 320, 480, 0x0a0812)
      .setStrokeStyle(3, 0xffd700);
    this.add.text(24, 24, "Reveal 0%", { color: "#00FFFF", fontSize: "18px" });
  }
}
