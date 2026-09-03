import { type Page, test as base } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;

/** Skips the current test file when no test account credentials are configured, instead of failing. */
export function requireCredentials() {
  base.skip(!E2E_EMAIL || !E2E_PASSWORD, "E2E_EMAIL/E2E_PASSWORD not set — skipping tests that need a real login");
}

export async function login(page: Page) {
  await page.goto("/login");
  // #signin-* rather than getByLabel("Email"/"Password") — the Sign up tab
  // has fields with the exact same label text, which would make those
  // locators ambiguous.
  await page.locator("#signin-email").fill(E2E_EMAIL!);
  await page.locator("#signin-password").fill(E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}
