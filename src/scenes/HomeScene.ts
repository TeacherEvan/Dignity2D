import Phaser from 'phaser';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    this.add.text(centerX, 96, 'Dignity Arcade', { color: '#FFD700', fontSize: '32px' }).setOrigin(0.5);
    this.add.text(centerX, 180, 'Quick Play', { color: '#00FFFF', fontSize: '28px' }).setOrigin(0.5).setInteractive()
      .on('pointerup', () => this.scene.start('GameScene'));
    this.add.text(centerX, 244, 'Create Room', { color: '#FFFFFF', fontSize: '24px' }).setOrigin(0.5);
    this.add.text(centerX, 300, 'Upload Image', { color: '#FFFFFF', fontSize: '24px' }).setOrigin(0.5);
  }
}