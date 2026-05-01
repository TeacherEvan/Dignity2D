import { describe, expect, it } from "vitest";
import { createTrailStyle } from "./TrailStyle";

describe("TrailStyle", () => {
  it("uses gold for safe trail and cyan for co-op accent", () => {
    const style = createTrailStyle(false);
    expect(style.primary).toBe(0xffd700);
    expect(style.partner).toBe(0x00ffff);
  });

  it("disables shader requirement in reduced effects mode", () => {
    const style = createTrailStyle(true);
    expect(style.useShader).toBe(false);
  });
});
