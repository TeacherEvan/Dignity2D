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

import { ACES_FRAG, ACESTonemapping, acesFilm } from "./ACESTonemapping";

describe("ACESTonemapping", () => {
  it("keeps numeric output clamped", () => {
    [0, 0.5, 1, 3, 10].forEach((input) => {
      expect(acesFilm(input)).toBeGreaterThanOrEqual(0);
      expect(acesFilm(input)).toBeLessThanOrEqual(1);
    });
  });

  it("configures the post pipeline and updates exposure without rendering pixels", () => {
    const game = {} as never;
    const pipeline = new ACESTonemapping(game);
    pipeline.setExposure(1.75);
    pipeline.onPreRender();

    expect(pipelineInstances[0]?.config).toEqual({
      game,
      name: "ACESTonemapping",
      fragShader: ACES_FRAG,
    });
    expect(pipelineInstances[0]?.set1f).toHaveBeenCalledWith("exposure", 1.75);
  });

  it("exports shader with ACESFilm and mediump precision", () => {
    expect(ACES_FRAG).toContain("ACESFilm");
    expect(ACES_FRAG).toContain("exposure");
    expect(ACES_FRAG).toContain("precision mediump float");
  });
});
