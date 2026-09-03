import { test, expect } from "@playwright/test";

test.describe("Sign-in page", () => {
  test("renders the sign-in form and redirects unauthenticated visitors here", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Welcome", { exact: true })).toBeVisible();
    await expect(page.locator("#signin-email")).toBeVisible();
    await expect(page.locator("#signin-password")).toBeVisible();
  });

  test("shows an error for incorrect credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#signin-email").fill("nonexistent-e2e-user@example.com");
    await page.locator("#signin-password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("switching to the Sign up tab shows the sign-up form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Sign up" }).click();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
  });

  test("Forgot password link goes to the reset-request page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expect(page.getByText("Reset your password", { exact: true })).toBeVisible();
  });
});
