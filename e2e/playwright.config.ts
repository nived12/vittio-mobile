import { defineConfig, devices } from "@playwright/test";

/** Dedicated port — avoids colliding with Expo web dev server (default 8081). */
const E2E_PORT = 4173;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  testDir: "./tests",
  outputDir: "test-results",
  timeout: 45_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }]
  ],
  use: {
    baseURL: E2E_BASE_URL,
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: `npx serve dist -p ${E2E_PORT} --no-clipboard`,
    cwd: "..",
    url: E2E_BASE_URL,
    // Only reuse our own static server on :4173 — never Expo dev on :8081.
    reuseExistingServer: !process.env.CI,
    timeout: 90_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
