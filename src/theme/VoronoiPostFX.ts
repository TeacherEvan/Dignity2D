import Phaser from 'phaser';

export const VORONOI_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float time;
varying vec2 outTexCoord;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord * 8.0;
  vec2 ip = floor(uv);
  vec2 fp = fract(uv);
  float res = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(float(i), float(j));
      vec2 r = b - fp + 0.5 + 0.45 * sin(time * 0.4 + 6.2831 * hash2(ip + b));
      float d = dot(r, r);
      res = min(res, d);
    }
  }
  float edge = 1.0 - smoothstep(0.0, 0.12, res);
  vec3 gold = vec3(1.0, 0.843, 0.0);
  vec3 cyan = vec3(0.0, 1.0, 1.0);
  vec3 glyph = mix(gold, cyan, sin(time * 0.3) * 0.5 + 0.5) * edge * 0.25;
  vec4 scene = texture2D(uMainSampler, outTexCoord);
  gl_FragColor = vec4(scene.rgb + glyph, scene.a);
}`;

export class VoronoiPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private elapsed = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'VoronoiPostFX', fragShader: VORONOI_FRAG });
  }

  onPreRender(): void {
    this.elapsed += 0.016;
    this.set1f('time', this.elapsed);
  }
}