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

import { VORONOI_FRAG } from './VoronoiPostFX';

describe('VoronoiPostFX', () => {
  it('uses Phaser-compatible mediump GLSL', () => {
    expect(VORONOI_FRAG).toContain('precision mediump float');
  });

  it('uses a capped 3x3 loop', () => {
    expect(VORONOI_FRAG).toMatch(/j\s*=\s*-1\s*;\s*j\s*<=\s*1/);
    expect(VORONOI_FRAG).toMatch(/i\s*=\s*-1\s*;\s*i\s*<=\s*1/);
  });

  it('blends over uMainSampler', () => {
    expect(VORONOI_FRAG).toContain('uMainSampler');
  });
});