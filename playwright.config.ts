import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a real Supabase project — there's no mocked backend
 * here — so they need a real test account's credentials. Set E2E_EMAIL and
 * E2E_PASSWORD (e.g. in a local .env.e2e, never committed) before running
 * `npm run test:e2e`. Tests that need auth skip themselves when unset,
 * rather than failing, so `npm run test:e2e` still works out of the box for
 * a fresh clone without those secrets.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  // Generous — this app's every request round-trips to a real Supabase
  // project, and dev-mode Turbopack compiles routes on first hit, so the
  // defaults (30s test / ~few-second nav) are too tight for a slow or
  // first-touch network path.
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
