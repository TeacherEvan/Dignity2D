import { describe, expect, it } from 'vitest';
import { canCommitCoOpCapture, mergeCoOpTrails } from './captureValidation';

describe('co-op capture validation', () => {
  it('merges two linked trails when endpoints match', () => {
    const a = { playerId: 'p1', startedAt: 0, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };
    const b = { playerId: 'p2', startedAt: 0, points: [{ x: 10, y: 10 }, { x: 0, y: 0 }] };
    expect(mergeCoOpTrails(a, b)?.points).toHaveLength(3);
  });

  it('rejects unrelated trails', () => {
    const a = { playerId: 'p1', startedAt: 0, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };
    const b = { playerId: 'p2', startedAt: 0, points: [{ x: 50, y: 50 }, { x: 60, y: 60 }] };
    expect(mergeCoOpTrails(a, b)).toBeNull();
  });

  it('allows closed merged capture', () => {
    const trail = { playerId: 'coop', startedAt: 0, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }] };
    expect(canCommitCoOpCapture(trail)).toBe(true);
  });
});