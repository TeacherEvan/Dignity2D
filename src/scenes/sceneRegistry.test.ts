import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scene: class {}
  }
}));

import { sceneRegistry } from './sceneRegistry';

describe('sceneRegistry', () => {
  it('contains home and game scenes', () => {
    expect(sceneRegistry.map((scene) => scene.key)).toEqual(['BootScene', 'HomeScene', 'GameScene']);
  });
});