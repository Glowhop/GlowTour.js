import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;

function readVersion(path: string) {
  const manifest = JSON.parse(readFileSync(path, "utf8")) as { name: string; version: string };
  if (!manifest.name || !manifest.version) throw new Error(`invalid package manifest: ${path}`);
  return manifest;
}

const args = Bun.argv.slice(2);
const expectedVersionIndex = args.indexOf("--expected-version");
const expectedVersion = expectedVersionIndex === -1 ? undefined : args[expectedVersionIndex + 1];
const allowedArgs = new Set(["--dry-run", "--expected-version", expectedVersion]);

if (!args.includes("--dry-run") || args.some((arg) => !allowedArgs.has(arg))) {
  throw new Error("usage: bun scripts/prepare-release.ts --dry-run [--expected-version X.Y.Z]");
}

if (expectedVersionIndex !== -1 && (!expectedVersion || !/^\d+\.\d+\.\d+$/.test(expectedVersion))) {
  throw new Error("--expected-version must be a stable X.Y.Z version");
}

for (const packageId of packageIds) {
  const source = readVersion(join(root, "packages", packageId, "package.json"));
  const builtPath = join(root, "packages", packageId, "dist", "package.json");
  if (!existsSync(builtPath)) throw new Error(`missing built manifest: ${builtPath}`);

  const built = readVersion(builtPath);
  if (source.name !== built.name || source.version !== built.version) {
    throw new Error(`${source.name} source and built versions must match`);
  }
  if (expectedVersion && source.version !== expectedVersion) {
    throw new Error(`${source.name} must match release version ${expectedVersion}`);
  }
}

console.log(`Non-publishing release preparation passed in order: ${packageIds.join(", ")}`);
