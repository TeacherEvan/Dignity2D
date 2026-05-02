import { describe, expect, it } from "vitest";
import { createEventTracker } from "./EventTracker";
import { resolveSessionMode } from "../session";

describe("diagnostics integration contracts", () => {
  it("tracks solo and multiplayer modes without IDs", () => {
    const tracker = createEventTracker({ now: () => 1 });
    const soloMode = resolveSessionMode({ imageId: "default-image" });
    const multiplayerMode = resolveSessionMode({
      roomId: "room-1",
      playerId: "p1",
    });

    tracker.track(
      soloMode === "solo" ? "solo_started" : "multiplayer_started",
      {
        mode: soloMode,
        imageId: "not-allowed",
      } as never,
    );
    tracker.track(
      multiplayerMode === "multiplayer"
        ? "multiplayer_started"
        : "solo_started",
      {
        mode: multiplayerMode,
        roomId: "not-allowed",
      } as never,
    );

    expect(tracker.snapshot()).toEqual([
      { name: "solo_started", at: 1, payload: { mode: "solo" } },
      { name: "multiplayer_started", at: 1, payload: { mode: "multiplayer" } },
    ]);
  });

  it("tracks display and layout without raw viewport dimensions", () => {
    const tracker = createEventTracker({ now: () => 2 });
    tracker.track("display_detected", {
      deviceClass: "phone",
      orientation: "portrait",
      width: 390,
      height: 844,
    } as never);
    tracker.track("layout_loaded", { layoutId: "portrait-phone-standard" });
    expect(tracker.snapshot()).toEqual([
      {
        name: "display_detected",
        at: 2,
        payload: { deviceClass: "phone", orientation: "portrait" },
      },
      {
        name: "layout_loaded",
        at: 2,
        payload: { layoutId: "portrait-phone-standard" },
      },
    ]);
  });
});
