import Phaser from "phaser";

const PostFXPipelineBase = (
  Phaser as unknown as {
    Renderer: {
      WebGL: {
        Pipelines: {
          PostFXPipeline: new (config: {
            game: Phaser.Game;
            name: string;
            fragShader: string;
          }) => {
            set1f(name: string, value: number): void;
          };
        };
      };
    };
  }
).Renderer.WebGL.Pipelines.PostFXPipeline;

export function acesFilm(x: number): number {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return Math.max(0, Math.min(1, (x * (a * x + b)) / (x * (c * x + d) + e)));
}

export const ACES_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float exposure;
varying vec2 outTexCoord;

vec3 ACESFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec4 color = texture2D(uMainSampler, outTexCoord);
  gl_FragColor = vec4(ACESFilm(color.rgb * exposure), color.a);
`;

export class ACESTonemapping extends PostFXPipelineBase {
  private exposure = 1.25;

  constructor(game: Phaser.Game) {
    super({ game, name: "ACESTonemapping", fragShader: ACES_FRAG });
  }

  setExposure(value: number): void {
    this.exposure = value;
  }

  onPreRender(): void {
    this.set1f("exposure", this.exposure);
  }
}
