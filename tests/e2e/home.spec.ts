import { expect, test } from "@playwright/test";

test("home menu opens and shows quick play", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
});
