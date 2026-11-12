import { expect, test } from "@playwright/test";

test("landing shows DOTS and auth CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DOTS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
});
