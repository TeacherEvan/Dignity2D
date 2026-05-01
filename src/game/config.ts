import Phaser from 'phaser';
import { sceneRegistry } from '../scenes/sceneRegistry';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#0A0812',
  width: 390,
  height: 844,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    antialiasGL: true,
    powerPreference: 'high-performance'
  },
  scene: sceneRegistry.map((item) => item.scene)
};