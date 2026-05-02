import { expect, test } from "@playwright/test";

test("home menu opens and shows quick play", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#launcher-shell")).toBeVisible();
  await expect(page.locator("#home-status")).toHaveText("Ready");
  await expect(page.locator("#room-id-input")).toBeVisible();
});

test("mobile welcome keeps primary controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#launcher-shell")).toBeVisible();
  await expect(page.locator("#quick-play-button")).toBeVisible();
  await expect(page.locator("#create-room-button")).toBeVisible();
  await expect(page.locator("#settings-button")).toBeVisible();
  await expect(page.locator("#accessibility-button")).toBeVisible();
});

test("quick play starts a solo canvas with persisted layout metadata", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-layout-id",
    /standard/,
  );
  await page.locator("#quick-play-button").click();
  await expect(page.locator("canvas")).toBeVisible();
});

test("home scene can upload an image and create a room", async ({ page }) => {
  await page.goto("/");

  await page.locator("#upload-input").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/C/HwAF/gL+q6KYlwAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("#home-status")).toContainText("Upload ready");
  await expect(page.locator("#upload-preview")).toBeVisible();

  await page.locator("#create-room-button").click();
  await expect(page.locator("#current-room-label")).toContainText(
    "Room ready: room-",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#return-to-launcher-button")).toBeVisible();
  await page.locator("#return-to-launcher-button").click();
  await expect(page.locator("#launcher-shell")).toBeVisible();
  await page.locator("#quick-play-button").click();
  await expect(page.locator("canvas")).toBeVisible();
});

test("visible room form allows joining after room creation", async ({
  browser,
}) => {
  const creator = await browser.newPage();
  await creator.goto("/");
  await creator.locator("#create-room-button").click();
  await expect(creator.locator("#current-room-label")).toContainText(
    "Room ready: room-",
  );
  const roomText = await creator.locator("#current-room-label").textContent();
  const roomId = roomText?.match(/room-\d+/)?.[0] ?? "";
  await creator.close();

  const joiner = await browser.newPage();
  await joiner.goto("/");
  await joiner.locator("#room-id-input").fill(roomId);
  await joiner.locator("#join-room-button").click();
  await expect(joiner.locator("canvas")).toBeVisible();
  await joiner.close();
});
