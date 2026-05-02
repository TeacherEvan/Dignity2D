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
import { joinRoomSession } from "./net/serverApi";

describe("launcher layout integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    vi.mocked(startGameSession).mockClear();
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
  });
});
