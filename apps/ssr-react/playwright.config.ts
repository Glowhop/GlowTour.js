import { defineConfig } from "@playwright/test";

const PORT = 4173;
export const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // Named `.pw.ts` rather than `.spec.ts` so `bun test` (root workspace default patterns match
  // `.spec.`/`.test.`) never tries to load and execute these Playwright-only files itself.
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
