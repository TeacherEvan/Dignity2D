import { describe, expect, it, vi } from "vitest";

const pipelineInstances: Array<{
  config: { game: unknown; name: string; fragShader: string };
  set1f: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("phaser", () => {
  class PostFXPipeline {
    readonly set1f = vi.fn();

    constructor(
      public readonly config: {
        game: unknown;
        name: string;
        fragShader: string;
      },
    ) {
      pipelineInstances.push(this);
    }
  }

  return {
    default: {
      Game: class {},
      Renderer: {
        WebGL: {
          Pipelines: {
            PostFXPipeline,
          },
        },
      },
    },
  };
});

import { VORONOI_FRAG, VoronoiPostFX } from "./VoronoiPostFX";

describe("VoronoiPostFX", () => {
  it("configures the pipeline and advances time uniforms without rendering pixels", () => {
    const game = {} as never;
    const pipeline = new VoronoiPostFX(game);

    pipeline.onPreRender();
    pipeline.onPreRender();

    expect(pipelineInstances[0]?.config).toEqual({
      game,
      name: "VoronoiPostFX",
      fragShader: VORONOI_FRAG,
    });
    expect(pipelineInstances[0]?.set1f).toHaveBeenNthCalledWith(1, "time", 0.016);
    expect(pipelineInstances[0]?.set1f).toHaveBeenNthCalledWith(2, "time", 0.032);
  });

  it("uses Phaser-compatible mediump GLSL", () => {
    expect(VORONOI_FRAG).toContain("precision mediump float");
  });

  it("uses a capped 3x3 loop", () => {
    expect(VORONOI_FRAG).toMatch(/j\s*=\s*-1\s*;\s*j\s*<=\s*1/);
    expect(VORONOI_FRAG).toMatch(/i\s*=\s*-1\s*;\s*i\s*<=\s*1/);
  });

  it("blends over uMainSampler", () => {
    expect(VORONOI_FRAG).toContain("uMainSampler");
  });
});
