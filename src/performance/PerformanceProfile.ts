export const PERF_THRESHOLD_FPS = 55;
export const MIN_SCALE = 0.5;

export type PerformanceInput = {
  fps: number;
  reducedMotion: boolean;
  renderer: string;
};

export type PerformanceProfile = {
  renderScale: number;
  particleCap: number;
  enableVoronoi: boolean;
  enableAces: boolean;
  enableTrailShader: boolean;
};

export function choosePerformanceProfile(
  input: PerformanceInput,
): PerformanceProfile {
  const slowRenderer = /PowerVR\s*SGX\s*5[0-4]|Adreno\s*3[0-9]{2}/i.test(
    input.renderer,
  );
  const lowFps = input.fps < PERF_THRESHOLD_FPS;
  const reduced = input.reducedMotion || slowRenderer || lowFps;
  return {
    renderScale: reduced ? MIN_SCALE : 1,
    particleCap: reduced ? 64 : 150,
    enableVoronoi: !reduced,
    enableAces: !lowFps,
    enableTrailShader: !input.reducedMotion,
  };
}
