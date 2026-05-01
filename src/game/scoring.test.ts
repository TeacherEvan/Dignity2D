import { describe, expect, it } from 'vitest';
import { calculateCaptureScore, hasWon, WIN_REVEAL_RATIO } from './scoring';

describe('scoring', () => {
  it('wins at exactly 75 percent reveal', () => {
    expect(WIN_REVEAL_RATIO).toBe(0.75);
    expect(hasWon(0.75)).toBe(true);
    expect(hasWon(0.749)).toBe(false);
  });

  it('scores larger and riskier captures higher', () => {
    const small = calculateCaptureScore({ area: 100, dangerMultiplier: 1, streak: 0, coOpBonus: 0 });
    const large = calculateCaptureScore({ area: 100, dangerMultiplier: 2, streak: 2, coOpBonus: 50 });
    expect(large).toBeGreaterThan(small);
  });
});