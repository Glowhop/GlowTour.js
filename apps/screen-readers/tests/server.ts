const PORT = 4174;

export const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Serves the production build, so the tests exercise the same bundles users ship. */
export const webServer = {
  command: "bun run preview",
  url: BASE_URL,
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
};
