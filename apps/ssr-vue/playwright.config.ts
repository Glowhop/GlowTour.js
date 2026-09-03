import { defineConfig } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: "node .output/server/index.mjs",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      NITRO_PORT: String(PORT),
      PORT: String(PORT),
    },
    timeout: 30_000,
  },
});
