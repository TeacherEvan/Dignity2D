import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./bootstrap", () => ({
  startGameSession: vi.fn(async () => ({ scene: { start: vi.fn() } })),
  stopGameSession: vi.fn(),
}));

vi.mock("./net/serverApi", () => ({
  createRoomSession: vi.fn(),
  joinRoomSession: vi.fn(),
  reconnectRoom: vi.fn(),
  uploadImage: vi.fn(),
}));

import { mountLauncher } from "./launcher";
import { startGameSession } from "./bootstrap";
import {
  createRoomSession,
  joinRoomSession,
  reconnectRoom,
} from "./net/serverApi";

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
    vi.mocked(reconnectRoom).mockReset();
  });

  it("detects display and stores layout metadata on the shell", () => {
    mountLauncher();
    const shell = document.querySelector<HTMLElement>("#launcher-shell");
    expect(shell?.dataset.deviceClass).toBe("desktop");
    expect(shell?.dataset.layoutId).toBe("desktop-standard");
    expect(shell?.dataset.launchPhase).toBe("igniting");
    expect(shell?.dataset.uploadState).toBe("empty");
  });

  it("settles the launcher ignition phase after mount", async () => {
    vi.useFakeTimers();

    try {
      mountLauncher();

      const shell = document.querySelector<HTMLElement>("#launcher-shell");
      expect(shell?.dataset.launchPhase).toBe("igniting");

      await vi.advanceTimersByTimeAsync(820);

      expect(shell?.dataset.launchPhase).toBe("ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes resolved layout id into quick play launch data", async () => {
    mountLauncher();
    document.querySelector<HTMLButtonElement>("#quick-play-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(startGameSession).toHaveBeenCalledWith(
      expect.objectContaining({
        layoutId: "desktop-standard",
        motionMode: "full",
      }),
    );
  });

  it("emits allowlisted launcher diagnostics without room or image identifiers", async () => {
    const sink = vi.fn();

    mountLauncher({
      diagnostics: {
        sink,
        now: () => 7,
      },
    });

    expect(sink).toHaveBeenNthCalledWith(1, [
      { name: "welcome_viewed", at: 7, payload: {} },
    ]);
    expect(sink).toHaveBeenNthCalledWith(2, [
      {
        name: "display_detected",
        at: 7,
        payload: {
          deviceClass: "desktop",
          orientation: "landscape",
          compactHud: false,
        },
      },
    ]);
    expect(sink).toHaveBeenNthCalledWith(3, [
      {
        name: "layout_loaded",
        at: 7,
        payload: { layoutId: "desktop-standard" },
      },
    ]);

    const settingsButton = document.querySelector<HTMLButtonElement>(
      "#settings-button",
    );
    const joystickScaleInput = document.querySelector<HTMLInputElement>(
      "#settings-joystick-scale",
    );
    if (!settingsButton || !joystickScaleInput) {
      throw new Error("settings controls missing in diagnostics test");
    }

    settingsButton.click();
    joystickScaleInput.value = "1.15";
    joystickScaleInput.dispatchEvent(new Event("input"));

    document.querySelector<HTMLButtonElement>("#quick-play-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink).toHaveBeenCalledWith([
      {
        name: "layout_saved",
        at: 7,
        payload: { layoutId: "desktop-standard" },
      },
    ]);
    expect(sink).toHaveBeenCalledWith([
      {
        name: "solo_started",
        at: 7,
        payload: { mode: "solo" },
      },
    ]);

    const flattenedEvents = sink.mock.calls.flatMap(([events]) => events);
    expect(flattenedEvents.some((event) => "roomId" in event.payload)).toBe(false);
    expect(flattenedEvents.some((event) => "imageId" in event.payload)).toBe(false);
    expect(flattenedEvents.some((event) => "imageUrl" in event.payload)).toBe(false);
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
      playerIds: ["p-7"],
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
      playerIds: ["p-8", "p-9"],
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

  it("reconnects the same player after returning to the launcher", async () => {
    vi.mocked(joinRoomSession).mockResolvedValue({
      roomId: "room-9",
      playerId: "p-9",
      playerIds: ["p-8", "p-9"],
      playerCount: 2,
      imageId: "img-9",
      stateVersion: 4,
      imageUrl: null,
      bytes: null,
      retention: null,
    });
    vi.mocked(reconnectRoom).mockResolvedValue({
      imageId: "img-9",
      playerIds: ["p-8", "p-9"],
      stateVersion: 5,
    });

    mountLauncher();
    const input = document.querySelector<HTMLInputElement>("#room-id-input");
    const returnButton = document.querySelector<HTMLButtonElement>(
      "#return-to-launcher-button",
    );
    if (!input || !returnButton) {
      throw new Error("launcher controls missing in reconnect test");
    }

    input.value = "room-9";
    document.querySelector<HTMLButtonElement>("#join-room-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    returnButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.querySelector<HTMLButtonElement>("#join-room-button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(joinRoomSession).toHaveBeenCalledTimes(1);
    expect(reconnectRoom).toHaveBeenCalledWith("room-9", "p-9");
    expect(startGameSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        roomId: "room-9",
        playerId: "p-9",
        roomPlayerIds: ["p-8", "p-9"],
        imageId: "img-9",
        stateVersion: 5,
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

  it("opens settings and persists handedness plus joystick scale for the device class", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });

    mountLauncher();

    const settingsButton = document.querySelector<HTMLButtonElement>(
      "#settings-button",
    );
    const handednessSelect = document.querySelector<HTMLSelectElement>(
      "#settings-handedness",
    );
    const joystickScaleInput = document.querySelector<HTMLInputElement>(
      "#settings-joystick-scale",
    );
    const settingsPanel = document.querySelector<HTMLElement>(
      "#settings-panel",
    );

    settingsButton?.click();

    expect(settingsPanel?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("#launcher-shell")?.dataset.openPanel).toBe(
      "settings-panel",
    );
    expect(handednessSelect?.value).toBe("left");
    expect(joystickScaleInput?.value).toBe("1.00");

    if (!handednessSelect || !joystickScaleInput) {
      throw new Error("settings controls missing in test");
    }

    handednessSelect.value = "right";
    handednessSelect.dispatchEvent(new Event("change"));
    joystickScaleInput.value = "1.25";
    joystickScaleInput.dispatchEvent(new Event("input"));

    expect(JSON.parse(localStorage.getItem("dignity.layout.phone.v1") ?? "null")).toEqual({
      layoutId: "portrait-phone-standard",
      joystickScale: 1.25,
      handedness: "right",
    });
    expect(document.querySelector("#home-status")?.textContent).toBe(
      "Settings saved for this device.",
    );
  });

  it("opens accessibility guidance with the active motion mode", () => {
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

    document.querySelector<HTMLButtonElement>("#accessibility-button")?.click();

    expect(document.querySelector<HTMLElement>("#accessibility-panel")?.hidden).toBe(
      false,
    );
    expect(document.querySelector<HTMLElement>("#launcher-shell")?.dataset.openPanel).toBe(
      "accessibility-panel",
    );
    expect(document.querySelector("#accessibility-motion-mode")?.textContent).toBe(
      "Reduced motion active",
    );
    expect(document.querySelector("#accessibility-guidance")?.textContent).toContain(
      "Motion is kept steady",
    );
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
        expect.objectContaining({
          layoutId: "desktop-standard",
          motionMode: "reduced",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
