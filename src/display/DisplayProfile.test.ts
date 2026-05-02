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
});
