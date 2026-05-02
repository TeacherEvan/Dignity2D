import { describe, expect, it } from "vitest";
import {
  detectDisplayProfile,
  readDisplayProfileFromWindow,
} from "./DisplayProfile";

describe("detectDisplayProfile", () => {
  it("detects portrait phone layout", () => {
    const profile = detectDisplayProfile({
      width: 390,
      height: 844,
      devicePixelRatio: 3,
    });
    expect(profile.deviceClass).toBe("phone");
    expect(profile.orientation).toBe("portrait");
    expect(profile.compactHud).toBe(true);
  });

  it("detects landscape phone layout", () => {
    const profile = detectDisplayProfile({
      width: 844,
      height: 390,
      devicePixelRatio: 3,
    });
    expect(profile.deviceClass).toBe("phone");
    expect(profile.orientation).toBe("landscape");
  });

  it("detects tablet layout", () => {
    const profile = detectDisplayProfile({
      width: 820,
      height: 1180,
      devicePixelRatio: 2,
    });
    expect(profile.deviceClass).toBe("tablet");
    expect(profile.orientation).toBe("portrait");
    expect(profile.compactHud).toBe(false);
  });

  it("detects desktop layout", () => {
    const profile = detectDisplayProfile({
      width: 1440,
      height: 900,
      devicePixelRatio: 1,
    });
    expect(profile.deviceClass).toBe("desktop");
    expect(profile.orientation).toBe("landscape");
  });

  it("reads visualViewport before inner size when available", () => {
    const profile = readDisplayProfileFromWindow({
      innerWidth: 900,
      innerHeight: 900,
      devicePixelRatio: 2,
      visualViewport: { width: 390, height: 844 },
    });
    expect(profile.width).toBe(390);
    expect(profile.height).toBe(844);
    expect(profile.deviceClass).toBe("phone");
  });

  it("treats the 600px shortest side threshold as tablet", () => {
    const profile = detectDisplayProfile({
      width: 600,
      height: 960,
      devicePixelRatio: 2,
    });

    expect(profile.deviceClass).toBe("tablet");
    expect(profile.orientation).toBe("portrait");
  });

  it("treats the 1200px longest side threshold as desktop", () => {
    const profile = detectDisplayProfile({
      width: 1200,
      height: 800,
      devicePixelRatio: 1,
    });

    expect(profile.deviceClass).toBe("desktop");
    expect(profile.orientation).toBe("landscape");
  });

  it("rounds viewport size and clamps device pixel ratio to at least one", () => {
    const profile = detectDisplayProfile({
      width: 389.6,
      height: 844.2,
      devicePixelRatio: 0,
    });

    expect(profile.width).toBe(390);
    expect(profile.height).toBe(844);
    expect(profile.devicePixelRatio).toBe(1);
  });

  it("falls back to inner window size when visualViewport is unavailable", () => {
    const profile = readDisplayProfileFromWindow({
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 1.5,
      visualViewport: null,
    });

    expect(profile.width).toBe(1024);
    expect(profile.height).toBe(768);
    expect(profile.deviceClass).toBe("tablet");
  });
});
