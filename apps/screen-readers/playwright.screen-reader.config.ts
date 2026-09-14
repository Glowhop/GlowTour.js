import { screenReaderConfig } from "@guidepup/playwright";
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, webServer } from "./tests/server";

const BROWSERS = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  webkit: devices["Desktop Safari"],
} as const;

const browser = (process.env.SCREEN_READER_BROWSER ?? "chromium") as keyof typeof BROWSERS;
if (!(browser in BROWSERS)) throw new Error(`Unknown SCREEN_READER_BROWSER "${browser}"`);

/**
 * Real screen readers (VoiceOver on macOS, NVDA on Windows) driven by Guidepup. Needs a machine
 * prepared with `@guidepup/setup`, so it runs in the dedicated GitHub workflow.
 */
export default defineConfig({
  ...screenReaderConfig,
  testDir: "./tests",
  testMatch: ["voiceover.pw.ts", "nvda.pw.ts"],
  // One screen reader instance per machine: tests cannot run in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Two journeys per adapter, each command waiting for the screen reader to finish speaking.
  timeout: 10 * 60 * 1000,
  reportSlowTests: null,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  // Screen readers cannot operate against headless browsers.
  projects: [{ name: browser, use: { ...BROWSERS[browser], headless: false } }],
  webServer,
});
