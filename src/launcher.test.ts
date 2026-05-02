import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./bootstrap", () => ({
  startGameSession: vi.fn(async () => ({ scene: { start: vi.fn() } })),
  stopGameSession: vi.fn(),
}));

vi.mock("./net/serverApi", () => ({
  createRoomSession: vi.fn(),
  joinRoomSession: vi.fn(),
  uploadImage: vi.fn(),
}));

import { mountLauncher } from "./launcher";
import { startGameSession } from "./bootstrap";
import { createRoomSession, joinRoomSession } from "./net/serverApi";

describe("launcher layout integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    vi.mocked(startGameSession).mockClear();
    vi.mocked(createRoomSession).mockReset();
    vi.mocked(joinRoomSession).mockReset();
  });

  it("detects display and stores layout metadata on the shell", () => {
    mountLauncher();
    const shell = document.querySelector<HTMLElement>("#launcher-shell");
    expect(shell?.dataset.deviceClass).toBe("desktop");
    expect(shell?.dataset.layoutId).toBe("desktop-standard");
  });

  it("passes resolved layout id into quick play launch data", async () => {
    mountLauncher();
    document.querySelector<HTMLButtonElement>("#quick-play-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(startGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ layoutId: "desktop-standard" }),
    );
  });

  it("shows short join failure status text", async () => {
    vi.mocked(joinRoomSession).mockRejectedValue(
      new Error("Room not found or full."),
    );

    mountLauncher();
    const input = document.querySelector<HTMLInputElement>("#room-id-input");
    if (!input) {
      throw new Error("room input missing in test");
    }
    input.value = "room-missing";

    document.querySelector<HTMLButtonElement>("#join-room-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("#home-status")?.textContent).toBe(
      "Join failed. Room is full.",
    );
    expect(
      document.querySelector<HTMLParagraphElement>("#home-status")?.dataset
        .emberTone,
    ).toBe("warm");
    expect(document.querySelector<HTMLElement>("#launcher-shell")?.dataset.activeCue).toBe(
      "status",
    );
  });

  it("keeps only one launcher cue active at a time", () => {
    vi.useFakeTimers();

    try {
      mountLauncher();

      const shell = document.querySelector<HTMLElement>("#launcher-shell");
      const quickPlayButton = document.querySelector<HTMLButtonElement>(
        "#quick-play-button",
      );
      const uploadTriggerButton = document.querySelector<HTMLButtonElement>(
        "#upload-trigger-button",
      );

      quickPlayButton?.focus();
      expect(shell?.dataset.activeCue).toBe("quick-play");

      uploadTriggerButton?.focus();
      expect(shell?.dataset.activeCue).toBe("upload");

      vi.advanceTimersByTime(1200);
      expect(shell?.dataset.activeCue).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("prefers the persisted phone layout for the detected device class", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });
    localStorage.setItem(
      "dignity.layout.phone.v1",
      JSON.stringify({
        layoutId: "portrait-phone-standard",
        joystickScale: 1.1,
        handedness: "right",
      }),
    );

    mountLauncher();
    document.querySelector<HTMLButtonElement>("#quick-play-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector<HTMLElement>("#launcher-shell")?.dataset).toMatchObject({
      deviceClass: "phone",
      layoutId: "portrait-phone-standard",
    });
    expect(startGameSession).toHaveBeenCalledWith(
      expect.objectContaining({ layoutId: "portrait-phone-standard" }),
    );
  });

  it("falls back to the current orientation layout when a saved phone layout is stale", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 844,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 390,
    });
    localStorage.setItem(
      "dignity.layout.phone.v1",
      JSON.stringify({
        layoutId: "portrait-phone-standard",
        joystickScale: 1.1,
        handedness: "right",
      }),
    );

    mountLauncher();

    expect(document.querySelector<HTMLElement>("#launcher-shell")?.dataset).toMatchObject({
      deviceClass: "phone",
      layoutId: "landscape-phone-standard",
    });
  });

  it("creates a room and launches multiplayer with returned session data", async () => {
    vi.mocked(createRoomSession).mockResolvedValue({
      roomId: "room-7",
      playerId: "p-7",
      playerCount: 1,
      imageId: "img-7",
      stateVersion: 3,
      imageUrl: null,
      bytes: null,
      retention: null,
    });

    mountLauncher();
    document.querySelector<HTMLButtonElement>("#create-room-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("#current-room-label")?.textContent).toBe(
      "Room ready: room-7",
    );
    expect(startGameSession).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-7",
        playerId: "p-7",
        imageId: "img-7",
        stateVersion: 3,
      }),
    );
  });

  it("joins a room and launches multiplayer with the joined room id", async () => {
    vi.mocked(joinRoomSession).mockResolvedValue({
      roomId: "room-9",
      playerId: "p-9",
      playerCount: 2,
      imageId: "img-9",
      stateVersion: 4,
      imageUrl: null,
      bytes: null,
      retention: null,
    });

    mountLauncher();
    const input = document.querySelector<HTMLInputElement>("#room-id-input");
    if (!input) {
      throw new Error("room input missing in test");
    }
    input.value = "room-9";

    document.querySelector<HTMLButtonElement>("#join-room-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("#current-room-label")?.textContent).toBe(
      "Joined room: room-9",
    );
    expect(startGameSession).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-9",
        playerId: "p-9",
        imageId: "img-9",
        stateVersion: 4,
      }),
    );
  });

  it("marks the launcher as reduced motion while keeping controls visible", () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    mountLauncher();

    const shell = document.querySelector<HTMLElement>("#launcher-shell");
    expect(shell?.dataset.motionMode).toBe("reduced");
    expect(document.querySelector("#quick-play-button")).toBeTruthy();
    expect(document.querySelector("#home-status")?.textContent).toBe("Ready");
  });

  it("keeps reduced motion mode free of transient cue state", async () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    try {
      mountLauncher();

      const shell = document.querySelector<HTMLElement>("#launcher-shell");
      const status = document.querySelector<HTMLElement>("#home-status");
      const quickPlayButton = document.querySelector<HTMLButtonElement>(
        "#quick-play-button",
      );

      quickPlayButton?.focus();
      expect(shell?.dataset.activeCue).toBeUndefined();
      quickPlayButton?.click();
      await Promise.resolve();

      expect(shell?.dataset.activeCue).toBeUndefined();
      expect(status?.dataset.emberTone).toBeUndefined();

      await vi.runAllTimersAsync();

      expect(shell?.dataset.activeCue).toBeUndefined();
      expect(status?.dataset.emberTone).toBeUndefined();
      expect(startGameSession).toHaveBeenCalledWith(
        expect.objectContaining({ layoutId: "desktop-standard" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
