import { describe, expect, it } from "vitest";
import { getStandardLayout, resolveLayoutWithPreference } from "./DeviceLayout";

describe("DeviceLayout", () => {
  it("places joystick left and ability right for phone portrait", () => {
    const layout = getStandardLayout({ deviceClass: "phone", orientation: "portrait", compactHud: true });
    expect(layout.id).toBe("portrait-phone-standard");
    expect(layout.joystick.anchor).toBe("bottom-left");
    expect(layout.ability.anchor).toBe("bottom-right");
    expect(layout.hud.compact).toBe(true);
  });

  it("uses stable landscape phone layout", () => {
    const layout = getStandardLayout({ deviceClass: "phone", orientation: "landscape", compactHud: true });
    expect(layout.id).toBe("landscape-phone-standard");
    expect(layout.board.maxHeight).toBeLessThanOrEqual(360);
  });

  it("uses wider HUD on desktop", () => {
    const layout = getStandardLayout({ deviceClass: "desktop", orientation: "landscape", compactHud: false });
    expect(layout.hud.compact).toBe(false);
    expect(layout.board.maxWidth).toBeGreaterThan(600);
  });

  it("applies persisted joystick scale within bounds", () => {
    const layout = resolveLayoutWithPreference(
      { deviceClass: "phone", orientation: "portrait", compactHud: true },
      { layoutId: "portrait-phone-standard", joystickScale: 1.5, handedness: "right" },
    );
    expect(layout.joystick.size).toBe(144);
    expect(layout.joystick.anchor).toBe("bottom-right");
    expect(layout.ability.anchor).toBe("bottom-left");
  });
});