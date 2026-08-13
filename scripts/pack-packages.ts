import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const tarballDirectory = join(root, ".artifacts", "tarballs");
const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"];

rmSync(tarballDirectory, { force: true, recursive: true });
mkdirSync(tarballDirectory, { recursive: true });

for (const packageId of packageIds) {
  const result = Bun.spawnSync(
    [
      "npm",
      "pack",
      join("packages", packageId, "dist"),
      "--pack-destination",
      tarballDirectory,
      "--ignore-scripts",
    ],
    {
      cwd: root,
      env: { ...process.env, npm_config_cache: join(root, ".artifacts", "npm-cache") },
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  if (result.exitCode !== 0) {
    throw new Error(`npm pack failed for ${packageId}:\n${result.stdout}\n${result.stderr}`);
  }
}

console.log(`Packed ${packageIds.length} local tarballs in ${tarballDirectory}.`);
