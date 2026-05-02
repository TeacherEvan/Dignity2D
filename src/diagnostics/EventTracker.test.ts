import { describe, expect, it, vi } from "vitest";
import { createEventTracker } from "./EventTracker";

describe("EventTracker", () => {
  it("stores allowlisted events in order", () => {
    const tracker = createEventTracker({ now: () => 10 });
    tracker.track("welcome_viewed", { deviceClass: "phone" });
    expect(tracker.snapshot()).toEqual([
      { name: "welcome_viewed", at: 10, payload: { deviceClass: "phone" } },
    ]);
  });

  it("rejects unknown events", () => {
    const tracker = createEventTracker();
    expect(() => tracker.track("room-1" as never)).toThrow(
      "Unsupported diagnostic event.",
    );
  });

  it("drops unsafe payload keys", () => {
    const tracker = createEventTracker({ now: () => 1 });
    tracker.track("solo_started", {
      imageUrl: "secret",
      fileName: "private.png",
      mode: "solo",
    } as never);
    expect(tracker.snapshot()[0]?.payload).toEqual({ mode: "solo" });
  });

  it("bounds the event queue", () => {
    const tracker = createEventTracker({ now: () => 1, maxEvents: 2 });
    tracker.track("welcome_viewed");
    tracker.track("display_detected");
    tracker.track("layout_loaded");
    expect(tracker.snapshot().map((event) => event.name)).toEqual([
      "display_detected",
      "layout_loaded",
    ]);
  });

  it("flushes to a sink and clears events", () => {
    const sink = vi.fn();
    const tracker = createEventTracker({ sink });
    tracker.track("enemy_collision", { enemyKind: "chaser" });
    tracker.flush();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(tracker.snapshot()).toEqual([]);
  });

  it("does not call the sink when flushed empty", () => {
    const sink = vi.fn();
    const tracker = createEventTracker({ sink });

    tracker.flush();

    expect(sink).not.toHaveBeenCalled();
  });

  it("returns a snapshot copy instead of the live queue", () => {
    const tracker = createEventTracker({ now: () => 2 });
    tracker.track("layout_saved", { layoutId: "desktop-standard" });

    const snapshot = tracker.snapshot();
    snapshot.push({ name: "welcome_viewed", at: 99, payload: {} });

    expect(tracker.snapshot()).toEqual([
      { name: "layout_saved", at: 2, payload: { layoutId: "desktop-standard" } },
    ]);
  });
});
