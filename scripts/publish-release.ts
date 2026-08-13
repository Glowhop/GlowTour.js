import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { packageIds, validateReleaseArtifacts } from "./prepare-release";

export type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type ReleaseManifest = {
  name: string;
  version: string;
};

type Runner = (command: string, args: readonly string[]) => CommandResult;

type PublishOptions = {
  dryRun?: boolean;
  manifests: readonly ReleaseManifest[];
  runner: Runner;
};

function isMissingPackage(result: CommandResult) {
  return result.exitCode !== 0 && /E404|404 Not Found|code 404/i.test(`${result.stdout}\n${result.stderr}`);
}

function runNpm(command: string, args: readonly string[]): CommandResult {
  const result = Bun.spawnSync([command, ...args], { stderr: "pipe", stdout: "pipe" });
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
}

export function publishRelease({ dryRun = false, manifests, runner }: PublishOptions) {
  const published: string[] = [];
  const skipped: string[] = [];
  const planned: string[] = [];

  for (const packageId of packageIds) {
    const manifest = manifests.find((entry) => entry.name === `@glowhop/${packageId}-tour`);
    if (!manifest) throw new Error(`missing release manifest for ${packageId}`);
    const packageAtVersion = `${manifest.name}@${manifest.version}`;
    if (dryRun) {
      planned.push(packageAtVersion);
      continue;
    }

    const view = runner("npm", ["view", packageAtVersion, "version", "--json"]);
    if (view.exitCode === 0) {
      skipped.push(manifest.name);
      console.log(`Skipping ${packageAtVersion}: already published.`);
      continue;
    }
    if (!isMissingPackage(view)) {
      throw new Error(`npm view ${packageAtVersion} failed:\n${view.stdout}${view.stderr}`);
    }

    const target = `./packages/${packageId}/dist`;
    const publish = runner("npm", ["publish", target, "--access", "public"]);
    if (publish.exitCode !== 0) {
      throw new Error(`npm publish ${target} --access public failed:\n${publish.stdout}${publish.stderr}`);
    }
    published.push(manifest.name);
    console.log(`Published ${packageAtVersion}.`);
  }
  if (dryRun) console.log(`Dry-run publication order: ${planned.join(", ")}`);
  return { dryRun: planned, published, skipped };
}

function main() {
  const args = Bun.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--dry-run")) {
    throw new Error("usage: bun scripts/publish-release.ts [--dry-run]");
  }
  const dryRun = args[0] === "--dry-run";
  if (!dryRun && process.env.GITHUB_ACTIONS !== "true") {
    throw new Error("publishing is restricted to GitHub Actions; use --dry-run locally");
  }

  const root = resolve(import.meta.dir, "..");
  validateReleaseArtifacts(root, process.env.RELEASE_VERSION);
  const manifests = packageIds.map((packageId) =>
    JSON.parse(readFileSync(join(root, "packages", packageId, "dist", "package.json"), "utf8")),
  ) as ReleaseManifest[];
  publishRelease({ dryRun, manifests, runner: runNpm });
}

if (import.meta.main) main();
