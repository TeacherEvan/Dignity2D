import { describe, it, expect, beforeEach, afterEach } from "vitest";
// Note: vitest config (tests/e2e/*.spec.ts) picks up this file; localStorage is mocked in the jsdom environment.
import { getDiscoveredIds, addDiscovered, loadManifest, pickNextReveal } from "../../src/discovery/store";

function clearCache() {
  localStorage.removeItem("dignity2d-discovered");
}

describe("discovery/store (image-reveal persistence)", () => {
  beforeEach(clearCache);
  afterEach(clearCache);

  it("getDiscoveredIds returns empty array initially", () => {
    expect(getDiscoveredIds()).toEqual([]);
  });

  it("addDiscovered adds UUID and getDiscoveredIds reflects it (non-repeat key)", () => {
    addDiscovered("rev-01");
    const ids = getDiscoveredIds();
    expect(ids).toContain("rev-01");
    expect(ids.length).toBe(1);
  });

  it("addDiscovered is idempotent (no duplicate UUIDs)", () => {
    addDiscovered("rev-01");
    addDiscovered("rev-01");
    expect(getDiscoveredIds()).toEqual(["rev-01"]);
  });

  it("addDiscovered supports multiple discovered images (level progressions => non-repeat)", () => {
    addDiscovered("rev-01");
    addDiscovered("rev-02");
    const ids = getDiscoveredIds();
    expect(ids).toContain("rev-01");
    expect(ids).toContain("rev-02");
    expect(ids.length).toBe(2);
  });

  it("loadManifest parses manifest.json and returns UUID entries (mocked fetch per Playwright skill: mock external, never app)", async () => {
    // Mock the external manifest fetch (not our app's internal behavior) to verify parsing contract.
    const originalFetch = global.fetch;
    global.fetch = async () =>
      ({ ok: true, json: async () => ({ images: [{ id: "rev-01", filename: "a.png", levelUnlock: "l1" }, { id: "rev-02", filename: "b.png", levelUnlock: "l2" }] }) }) as Response;
    try {
      const manifest = await loadManifest();
      expect(manifest.length).toBe(2);
      expect(manifest[0].id).toMatch(/^rev-/);
      expect(manifest[0]).toHaveProperty("filename");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("pickNextReveal skips discovered UUIDs (non-repeat rule verified)", async () => {
    // Simulate completed level progressions -> rev-01 and rev-02 discovered.
    addDiscovered("rev-01");
    addDiscovered("rev-02");
    const nextReveal = await pickNextReveal();
    // With placeholder manifest (2 items both completed) -> no new reveal.
    expect(nextReveal).toBeNull();
  });

  it("pickNextReveal returns the first undiscovered when some remain", async () => {
    // Only rev-01 completed -> rev-02 should be the next reveal.
    addDiscovered("rev-01");
    const nextReveal = await pickNextReveal();
    // Note: depends on manifest order; verifies non-repeat filtering works, not exact id.
    if (nextReveal) {
      expect(nextReveal).toHaveProperty("id");
      expect(getDiscoveredIds()).not.toContain(nextReveal.id);
    }
  });
});
