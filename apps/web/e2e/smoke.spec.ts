import { expect, test } from "@playwright/test";

test("lobby shows DOTS and play actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DOTS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find match" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create private room" })).toBeVisible();
});
