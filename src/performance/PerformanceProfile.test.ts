import { describe, expect, it } from "vitest";
import {
  choosePerformanceProfile,
  MIN_SCALE,
  PERF_THRESHOLD_FPS,
} from "./PerformanceProfile";

describe("PerformanceProfile", () => {
  it("uses 55 FPS threshold and 0.5 scale floor", () => {
    expect(PERF_THRESHOLD_FPS).toBe(55);
    expect(MIN_SCALE).toBe(0.5);
  });

  it("disables expensive effects on low FPS", () => {
    const profile = choosePerformanceProfile({
      fps: 30,
      reducedMotion: false,
      renderer: "Adreno 320",
    });
    expect(profile.enableVoronoi).toBe(false);
    expect(profile.enableAces).toBe(false);
    expect(profile.particleCap).toBeLessThanOrEqual(80);
  });

  it("honors reduced motion", () => {
    const profile = choosePerformanceProfile({
      fps: 60,
      reducedMotion: true,
      renderer: "Apple M1",
    });
    expect(profile.enableVoronoi).toBe(false);
  });
});
