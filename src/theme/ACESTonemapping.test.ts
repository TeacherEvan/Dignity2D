import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class PostFXPipeline {
    set1f(): void {}
  }

  return {
    default: {
      Game: class {},
      Renderer: {
        WebGL: {
          Pipelines: {
            PostFXPipeline
          }
        }
      }
    }
  };
});

import { ACES_FRAG, acesFilm } from './ACESTonemapping';

describe('ACESTonemapping', () => {
  it('keeps numeric output clamped', () => {
    [0, 0.5, 1, 3, 10].forEach((input) => {
      expect(acesFilm(input)).toBeGreaterThanOrEqual(0);
      expect(acesFilm(input)).toBeLessThanOrEqual(1);
    });
  });

  it('exports shader with ACESFilm and exposure', () => {
    expect(ACES_FRAG).toContain('ACESFilm');
    expect(ACES_FRAG).toContain('exposure');
    expect(ACES_FRAG).toContain('precision mediump float');
  });
});