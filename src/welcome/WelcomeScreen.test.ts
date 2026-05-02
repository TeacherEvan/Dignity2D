import { describe, expect, it } from "vitest";
import { createWelcomeScreenHtml } from "./WelcomeScreen";

describe("createWelcomeScreenHtml", () => {
  it("renders primary welcome actions", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    expect(document.querySelector("#quick-play-button")?.textContent).toBe(
      "Quick Play",
    );
    expect(document.querySelector("#create-room-button")?.textContent).toBe(
      "Create Room",
    );
    expect(document.querySelector("#join-room-button")?.textContent).toBe(
      "Join",
    );
    expect(document.querySelector("#upload-trigger-button")?.textContent).toBe(
      "Upload Image",
    );
  });

  it("renders settings and accessibility controls", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    expect(document.querySelector("#settings-button")?.textContent).toBe(
      "Settings",
    );
    expect(document.querySelector("#accessibility-button")?.textContent).toBe(
      "Accessibility",
    );
  });

  it("keeps calm welcome copy visible", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    expect(document.querySelector("#welcome-title")?.textContent).toContain(
      "Reveal",
    );
    expect(document.querySelector("#home-status")?.textContent).toBe("Ready");
  });

  it("announces launcher status updates to assistive technology", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    const status = document.querySelector("#home-status");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.getAttribute("aria-atomic")).toBe("true");
  });

  it("renders join controls with clear defaults", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    const input = document.querySelector<HTMLInputElement>("#room-id-input");

    expect(input?.getAttribute("placeholder")).toBe("room-1");
    expect(document.querySelector("#current-room-label")?.textContent).toBe(
      "No room created yet.",
    );
  });

  it("keeps upload controls private until the player chooses an image", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    const uploadInput = document.querySelector<HTMLInputElement>("#upload-input");
    const preview = document.querySelector<HTMLImageElement>("#upload-preview");

    expect(uploadInput?.getAttribute("accept")).toBe(
      "image/png,image/jpeg,image/webp",
    );
    expect(preview?.style.display).toBe("none");
    expect(document.querySelector("#upload-filename")?.textContent).toBe(
      "Using default hidden image.",
    );
  });

  it("keeps the return control hidden until a game starts", () => {
    document.body.innerHTML = createWelcomeScreenHtml();
    expect(
      document.querySelector<HTMLButtonElement>("#return-to-launcher-button")
        ?.style.display,
    ).toBe("none");
  });

  it("renders a dedicated ember layer and stable launcher hooks", () => {
    document.body.innerHTML = createWelcomeScreenHtml();

    expect(document.querySelector("#launcher-ember-layer")).toBeTruthy();
    expect(
      document.querySelector('[data-launcher-actions="primary"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-launcher-status-region="home"]'),
    ).toBeTruthy();
  });
});
