import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageStore } from "./ImageStore";

afterEach(() => {
  vi.useRealTimers();
});

describe("ImageStore", () => {
  it("requires the correct access token for reads", () => {
    const store = new ImageStore(() => 100);
    const saved = store.save(Buffer.from("abc"), "session");

    expect(store.getAuthorized(saved.id, saved.accessToken)?.id).toBe(saved.id);
    expect(store.getAuthorized(saved.id, "wrong-token")).toBeNull();
  });

  it("expires stored images when the retention window passes", () => {
    let now = 100;
    const store = new ImageStore(() => now);
    const saved = store.save(Buffer.from("abc"), "session");

    expect(store.get(saved.id)?.id).toBe(saved.id);

    now += 6 * 60 * 60 * 1000 + 1;
    expect(store.get(saved.id)).toBeNull();
  });

  it("evicts expired uploads when the retention deadline elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100);
    const store = new ImageStore();

    store.save(Buffer.from("abc"), "session");
    expect(
      (store as unknown as { images: Map<string, unknown> }).images.size,
    ).toBe(1);

    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);
    expect(
      (store as unknown as { images: Map<string, unknown> }).images.size,
    ).toBe(0);
  });
});
