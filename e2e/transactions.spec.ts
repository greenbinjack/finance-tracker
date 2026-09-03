import { test, expect } from "@playwright/test";
import { requireCredentials, login } from "./helpers";

// Unique per run — a retried or previously-interrupted run must never
// collide with (and get confused by) a still-present earlier attempt.
const NOTE = `Playwright E2E test transaction ${Date.now()}`;

test.describe("Adding a transaction", () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test("creates an expense, sees it in history, then deletes it", async ({ page }) => {
    await login(page);

    await page.goto("/transactions/new");
    await page.getByPlaceholder("0.00").fill("42");
    await page.getByPlaceholder(/Lunch with friends/).fill(NOTE);
    await page.getByRole("button", { name: "Add transaction" }).click();

    // Submitting redirects to /transactions — confirms the create actually
    // went through rather than silently failing.
    await page.waitForURL("/transactions");

    let created = true;
    try {
      // The note is unique to this run, so searching for it narrows the
      // list to exactly this one row — no need to locate it among others.
      await page.goto(`/transactions?q=${encodeURIComponent(NOTE)}`);
      await expect(page.getByText(NOTE)).toBeVisible();

      await page.getByRole("button", { name: "Edit transaction" }).click();
      await page.waitForURL(/\/transactions\/.+\/edit/);
      // The Delete trigger is a Base UI dialog trigger wrapping a styled
      // span that also carries role="button" with the same name — target
      // the actual trigger element ([data-slot="dialog-trigger"]) to avoid
      // that ambiguity, then click the confirm dialog's own Delete button.
      await page.locator('[data-slot="dialog-trigger"]', { hasText: "Delete" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
      await page.waitForURL("/transactions");
      created = false;

      await page.goto(`/transactions?q=${encodeURIComponent(NOTE)}`);
      await expect(page.getByText(/No transactions/)).toBeVisible();
    } finally {
      // Belt-and-braces: if an assertion above threw before the delete step
      // ran, still remove the transaction this test created, rather than
      // leaving real test data behind in a real account.
      if (created && !page.isClosed()) {
        try {
          await page.goto(`/transactions?q=${encodeURIComponent(NOTE)}`);
          await page.getByRole("button", { name: "Edit transaction" }).click();
          await page.waitForURL(/\/transactions\/.+\/edit/);
          await page.locator('[data-slot="dialog-trigger"]', { hasText: "Delete" }).click();
          await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
        } catch {
          // The page/context may already be torn down if the test itself
          // timed out — nothing more can be done from here in that case.
        }
      }
    }
  });

  test("search filters the transaction list", async ({ page }) => {
    await login(page);
    await page.goto("/transactions");

    const searchBox = page.getByPlaceholder("Search notes...");
    await searchBox.fill("zzz-no-such-transaction-should-match-zzz");
    await expect(page.getByText(/No transactions/)).toBeVisible();

    await searchBox.fill("");
  });
});
