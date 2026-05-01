import { describe, expect, it } from 'vitest';
import { interpolatePoint, shouldPauseRankedScoring } from './RoomClient';

describe('RoomClient', () => {
  it('interpolates teammate movement', () => {
    expect(interpolatePoint({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5)).toEqual({ x: 5, y: 0 });
  });

  it('pauses ranked scoring on high latency', () => {
    expect(shouldPauseRankedScoring(351)).toBe(true);
    expect(shouldPauseRankedScoring(120)).toBe(false);
  });
});