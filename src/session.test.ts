import { describe, expect, it } from "vitest";
import {
  getPendingLaunchData,
  resolveSessionMode,
  setPendingLaunchData,
} from "./session";

describe("session", () => {
  it("treats missing room as solo", () => {
    expect(resolveSessionMode({ imageId: "default-image" })).toBe("solo");
  });

  it("treats room launches with player id as multiplayer", () => {
    expect(resolveSessionMode({ roomId: "room-1", playerId: "p1" })).toBe(
      "multiplayer",
    );
  });

  it("does not treat incomplete room data as multiplayer", () => {
    expect(resolveSessionMode({ roomId: "room-1" })).toBe("solo");
  });

  it("preserves layout data in pending launch state", () => {
    setPendingLaunchData({
      imageId: "img-1",
      layoutId: "portrait-phone-standard",
      motionMode: "reduced",
    });
    expect(getPendingLaunchData()).toEqual({
      imageId: "img-1",
      layoutId: "portrait-phone-standard",
      motionMode: "reduced",
    });
  });
});
