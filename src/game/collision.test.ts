import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './types';
import { cancelTrailOnProjectileHit, circleHitsPolyline } from './collision';
import { movePlayer } from './capture/trailState';

describe('collision', () => {
  it('detects projectile hitting active trail', () => {
    const trail = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
    expect(circleHitsPolyline({ x: 10, y: 1 }, 3, trail)).toBe(true);
  });

  it('cancels active trail on hit', () => {
    const drawing = movePlayer(createInitialGameState('level', 100, 100), 'p1', { x: 20, y: 20 }, 0);
    const next = cancelTrailOnProjectileHit(drawing, 'p1');
    expect(next.players[0].position).toEqual({ x: 0, y: 0 });
    expect(next.players[0].activeTrail).toBeNull();
  });
});