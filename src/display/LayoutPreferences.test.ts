import { beforeEach, describe, expect, it } from "vitest";
import {
  loadLayoutPreference,
  saveLayoutPreference,
} from "./LayoutPreferences";

describe("LayoutPreferences", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no layout is stored", () => {
    expect(loadLayoutPreference("phone")).toBeNull();
  });

  it("persists a layout by device class", () => {
    saveLayoutPreference("phone", {
      layoutId: "portrait-phone-standard",
      joystickScale: 1.2,
      handedness: "left",
    });
    expect(loadLayoutPreference("phone")).toEqual({
      layoutId: "portrait-phone-standard",
      joystickScale: 1.2,
      handedness: "left",
    });
  });

  it("keeps tablet and phone preferences separate", () => {
    saveLayoutPreference("phone", {
      layoutId: "portrait-phone-standard",
      joystickScale: 1,
      handedness: "left",
    });
    expect(loadLayoutPreference("tablet")).toBeNull();
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem("dignity.layout.phone.v1", "{bad");
    expect(loadLayoutPreference("phone")).toBeNull();
  });

  it("rejects invalid handedness", () => {
    localStorage.setItem(
      "dignity.layout.phone.v1",
      JSON.stringify({
        layoutId: "portrait-phone-standard",
        joystickScale: 1,
        handedness: "middle",
      }),
    );
    expect(loadLayoutPreference("phone")).toBeNull();
  });

  it("replaces the saved layout for the same device class", () => {
    saveLayoutPreference("phone", {
      layoutId: "portrait-phone-standard",
      joystickScale: 1,
      handedness: "left",
    });
    saveLayoutPreference("phone", {
      layoutId: "landscape-phone-standard",
      joystickScale: 1.25,
      handedness: "right",
    });

    expect(loadLayoutPreference("phone")).toEqual({
      layoutId: "landscape-phone-standard",
      joystickScale: 1.25,
      handedness: "right",
    });
  });

  it("keeps desktop preferences isolated from other device classes", () => {
    saveLayoutPreference("desktop", {
      layoutId: "desktop-standard",
      joystickScale: 0.95,
      handedness: "right",
    });

    expect(loadLayoutPreference("phone")).toBeNull();
    expect(loadLayoutPreference("desktop")).toEqual({
      layoutId: "desktop-standard",
      joystickScale: 0.95,
      handedness: "right",
    });
  });
});
