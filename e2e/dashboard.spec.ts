import { test, expect } from "@playwright/test";
import { requireCredentials, login } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(() => {
    requireCredentials();
  });

  test("logs in and shows the dashboard's core sections", async ({ page }) => {
    await login(page);

    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText(/Net worth|Total balance/)).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();
  });

  test("bottom nav reaches every primary tab", async ({ page }) => {
    await login(page);

    await page.getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL("/transactions");

    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL("/reports");

    await page.getByRole("link", { name: "More" }).click();
    await expect(page).toHaveURL("/more");

    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
