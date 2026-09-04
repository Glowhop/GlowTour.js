import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Trace the workspace root explicitly so Next.js doesn't try to infer it
  // from the monorepo's multiple lockfiles.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
