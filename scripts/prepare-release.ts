import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PackageManifest } from "./package-manifests";

const root = resolve(import.meta.dir, "..");
export const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;
const internalPackageNames = new Set(packageIds.map((packageId) => `@glowhop/${packageId}-tour`));

function readManifest(path: string): PackageManifest {
  const manifest = JSON.parse(readFileSync(path, "utf8")) as PackageManifest;
  if (!manifest.name || !manifest.version) throw new Error(`invalid package manifest: ${path}`);
  return manifest;
}

function assertInternalDependencies(
  manifest: PackageManifest,
  expectedVersion: string,
  allowWorkspaceReferences = false,
) {
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    if (
      internalPackageNames.has(name) &&
      version !== expectedVersion &&
      !(allowWorkspaceReferences && version === "workspace:*")
    ) {
      throw new Error(`${manifest.name} dependency ${name} must match release version ${expectedVersion}`);
    }
  }
}

export function validateReleaseArtifacts(directory: string, expectedVersion?: string) {
  for (const packageId of packageIds) {
    const source = readManifest(join(directory, "packages", packageId, "package.json"));
    const builtPath = join(directory, "packages", packageId, "dist", "package.json");
    if (!existsSync(builtPath)) throw new Error(`missing built manifest: ${builtPath}`);

    const built = readManifest(builtPath);
    if (source.name !== built.name || source.version !== built.version) {
      throw new Error(`${source.name} source and built versions must match`);
    }
    if (JSON.stringify(source.repository) !== JSON.stringify(built.repository)) {
      throw new Error(`${source.name} source and built repository metadata must match`);
    }
    const releaseVersion = expectedVersion ?? source.version;
    if (source.version !== releaseVersion) {
      throw new Error(`${source.name} must match release version ${releaseVersion}`);
    }
    assertInternalDependencies(source, releaseVersion, true);
    assertInternalDependencies(built, releaseVersion);
  }
  return packageIds;
}

function main() {
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

  const order = validateReleaseArtifacts(root, expectedVersion);
  console.log(`Non-publishing release preparation passed in order: ${order.join(", ")}`);
}

if (import.meta.main) main();
