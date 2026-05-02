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
});
