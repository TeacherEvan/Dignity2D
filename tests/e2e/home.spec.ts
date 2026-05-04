import { expect, test, type Page } from "@playwright/test";

async function readRoomId(page: Page): Promise<string> {
  const roomText = await page.locator("#current-room-label").textContent();
  return roomText?.match(/room-\d+/)?.[0] ?? "";
}

test("home menu opens and shows quick play", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#launcher-shell")).toBeVisible();
  await expect(page.locator("#launcher-ember-layer")).toBeVisible();
  await expect(page.locator("#home-status")).toHaveText("Ready");
  await expect(page.locator("#room-id-input")).toBeVisible();
});

test("mobile welcome keeps primary controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#launcher-shell")).toBeVisible();
  await expect(page.locator('[data-launcher-actions="primary"]')).toBeVisible();
  await expect(page.locator("#quick-play-button")).toBeVisible();
  await expect(page.locator("#create-room-button")).toBeVisible();
  await expect(page.locator("#settings-button")).toBeVisible();
  await expect(page.locator("#accessibility-button")).toBeVisible();
});

test("reduced motion keeps the launcher readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-motion-mode",
    "reduced",
  );
  await expect(page.locator("#quick-play-button")).toBeVisible();
  await expect(page.locator("#home-status")).toHaveText("Ready");
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

test("launcher recalculates mobile layout across reloads and viewport changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-device-class",
    "phone",
  );
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-layout-id",
    "portrait-phone-standard",
  );

  await page.evaluate(() => {
    localStorage.setItem(
      "dignity.layout.phone.v1",
      JSON.stringify({
        layoutId: "portrait-phone-standard",
        joystickScale: 1.15,
        handedness: "right",
      }),
    );
  });

  await page.reload();
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-layout-id",
    "portrait-phone-standard",
  );

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-device-class",
    "phone",
  );
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-layout-id",
    "landscape-phone-standard",
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-device-class",
    "desktop",
  );
  await expect(page.locator("#launcher-shell")).toHaveAttribute(
    "data-layout-id",
    "desktop-standard",
  );
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

test("two browser pages can create and join the same multiplayer room", async ({
  browser,
}) => {
  const creator = await browser.newPage();
  const joiner = await browser.newPage();

  try {
    await creator.goto("/");
    await joiner.goto("/");

    await creator.locator("#create-room-button").click();
    await expect(creator.locator("#current-room-label")).toContainText(
      "Room ready: room-",
    );
    await expect(creator.locator("canvas")).toBeVisible();
    await expect(creator.locator("#return-to-launcher-button")).toBeVisible();

    const roomId = await readRoomId(creator);
    expect(roomId).toMatch(/^room-\d+$/);

    await joiner.locator("#room-id-input").fill(roomId);
    await joiner.locator("#join-room-button").click();

    await expect(joiner.locator("canvas")).toBeVisible();
    await expect(joiner.locator("#return-to-launcher-button")).toBeVisible();
    await expect(joiner.locator("#current-room-label")).toContainText(
      `Joined room: ${roomId}`,
    );
    await expect(joiner.locator("#home-status")).toContainText(
      `Launching ${roomId}...`,
    );
  } finally {
    await creator.close();
    await joiner.close();
  }
});

test("a player can return to the launcher and rejoin the same multiplayer room", async ({
  browser,
}) => {
  const creator = await browser.newPage();
  const joiner = await browser.newPage();

  try {
    await creator.goto("/");
    await joiner.goto("/");

    await creator.locator("#create-room-button").click();
    await expect(creator.locator("#current-room-label")).toContainText(
      "Room ready: room-",
    );

    const roomId = await readRoomId(creator);
    expect(roomId).toMatch(/^room-\d+$/);

    await joiner.locator("#room-id-input").fill(roomId);
    await joiner.locator("#join-room-button").click();
    await expect(joiner.locator("canvas")).toBeVisible();

    await joiner.locator("#return-to-launcher-button").click();
    await expect(joiner.locator("#launcher-shell")).toBeVisible();
    await expect(joiner.locator("#room-id-input")).toHaveValue(roomId);
    await expect(joiner.locator("#current-room-label")).toContainText(
      `Joined room: ${roomId}`,
    );

    await joiner.locator("#join-room-button").click();

    await expect(joiner.locator("canvas")).toBeVisible();
    await expect(joiner.locator("#return-to-launcher-button")).toBeVisible();
    await expect(joiner.locator("#home-status")).toContainText(
      `Launching ${roomId}...`,
    );
  } finally {
    await creator.close();
    await joiner.close();
  }
});
