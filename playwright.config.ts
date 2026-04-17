import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 90_000,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 45_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "watchlist",
      testMatch: "**/watchlist.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
    {
      name: "a11y",
      testMatch: "**/a11y.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
    {
      name: "theme",
      testMatch: "**/theme.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
    {
      name: "resilience",
      testMatch: "**/resilience.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
    {
      name: "reviews",
      testMatch: "**/reviews.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});