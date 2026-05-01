import { describe, expect, it } from 'vitest';
import { createEnemyWave, MAX_PROJECTILES_MOBILE } from './EnemySpawner';

describe('EnemySpawner', () => {
  it('creates readable alien kinds', () => {
    const wave = createEnemyWave(2, { width: 300, height: 400 });
    expect(wave.map((enemy) => enemy.kind)).toContain('chaser');
    expect(wave.map((enemy) => enemy.kind)).toContain('shooter');
  });

  it('caps mobile projectiles', () => {
    expect(MAX_PROJECTILES_MOBILE).toBeLessThanOrEqual(80);
  });
});