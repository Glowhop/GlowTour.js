import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, webServer } from "./tests/server";

/**
 * Accessibility-tree suite: fast and deterministic, runs on every PR. It checks the semantics
 * screen readers consume. What they actually speak is covered by playwright.screen-reader.config.ts.
 */
export default defineConfig({
  testDir: "./tests",
  // Named `.pw.ts` rather than `.spec.ts` so `bun test` never loads these Playwright-only files.
  testMatch: "accessibility-tree.pw.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
  webServer,
});
