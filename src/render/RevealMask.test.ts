import { describe, expect, it } from 'vitest';
import { calculateRevealPercentText, makeMaskResolution } from './RevealMask';

describe('RevealMask', () => {
  it('formats reveal percent for HUD', () => {
    expect(calculateRevealPercentText(0.754)).toBe('Reveal 75%');
  });

  it('caps mask resolution for mobile performance', () => {
    expect(makeMaskResolution(4000, 3000, 512)).toEqual({ width: 512, height: 384 });
  });
});