import { expect, test } from "@playwright/test";

test("landing shows DOTS and auth CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DOTS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rating FAQ" })).toBeVisible();
});

test("public rating FAQ is reachable", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { name: "Rating FAQ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How rating works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Titles (Classical only)" })).toBeVisible();
});
