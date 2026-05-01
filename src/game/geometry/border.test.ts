import { describe, expect, it } from 'vitest';
import { isOnOuterBorder, isPointInPolygon, isSafePoint } from './border';

const size = { width: 100, height: 80 };
const capture = [{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 40 }, { x: 10, y: 40 }];

describe('border geometry', () => {
  it('treats image edges as safe outer border', () => {
    expect(isOnOuterBorder({ x: 0, y: 20 }, size)).toBe(true);
    expect(isOnOuterBorder({ x: 50, y: 80 }, size)).toBe(true);
  });

  it('treats interior points as off border', () => {
    expect(isOnOuterBorder({ x: 50, y: 50 }, size)).toBe(false);
  });

  it('detects points inside captured polygons', () => {
    expect(isPointInPolygon({ x: 20, y: 20 }, capture)).toBe(true);
    expect(isPointInPolygon({ x: 60, y: 20 }, capture)).toBe(false);
  });

  it('treats captured territory as safe', () => {
    expect(isSafePoint({ x: 20, y: 20 }, size, [capture])).toBe(true);
  });
});