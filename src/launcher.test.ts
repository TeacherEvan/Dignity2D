import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./bootstrap", () => ({
  startGameSession: vi.fn(async () => ({ scene: { start: vi.fn() } })),
  stopGameSession: vi.fn(),
}));

import { mountLauncher } from "./launcher";
import { startGameSession } from "./bootstrap";

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
});
