import { describe, expect, it } from 'vitest';
import { normalizeJoystickVector, applyDeadZone } from './VirtualJoystick';

describe('VirtualJoystick', () => {
  it('normalizes long vectors to length 1', () => {
    expect(normalizeJoystickVector({ x: 20, y: 0 })).toEqual({ x: 1, y: 0 });
  });

  it('zeros vectors inside dead zone', () => {
    expect(applyDeadZone({ x: 0.05, y: 0.05 }, 0.2)).toEqual({ x: 0, y: 0 });
  });

  it('keeps vectors outside dead zone', () => {
    expect(applyDeadZone({ x: 0.5, y: 0 }, 0.2)).toEqual({ x: 0.5, y: 0 });
  });
});