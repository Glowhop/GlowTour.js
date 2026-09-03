import { defineConfig } from "@playwright/test";

const PORT = 4321;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  webServer: {
    command: `bun run build && bun run start -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
});
