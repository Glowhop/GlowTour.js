import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "bun:test";
import { parse } from "yaml";

const root = resolve(import.meta.dir, "..");
const packageNames = [
  "@glowhop/core-tour",
  "@glowhop/styles-tour",
  "@glowhop/react-tour",
  "@glowhop/vue-tour",
  "@glowhop/angular-tour",
  "@glowhop/solid-tour",
  "@glowhop/vanilla-tour",
] as const;
const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;
const actionPins = [
  "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683", // v4.2.2
  "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6", // v2.2.0
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020", // v4.4.0
  "changesets/action@198f833dd7d863100ea6e28967bc9a9fdefadb0a", // v2.1.0
] as const;

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function parseWorkflow(path: string) {
  return parse(read(path)) as Record<string, unknown>;
}

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("expected an object");
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  throw new Error("expected a string array");
}

function workflowUses(rawWorkflow: string): string[] {
  return [...rawWorkflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
}

test("Changesets keeps every public package in one fixed release group", () => {
  const configPath = ".changeset/config.json";
  if (!existsSync(join(root, configPath))) throw new Error(`${configPath} is missing`);

  const config = JSON.parse(read(configPath)) as Record<string, unknown>;
  const privatePackages = record(config.privatePackages);

  expect(config.access).toBe("public");
  expect(config.baseBranch).toBe("main");
  expect(config.updateInternalDependencies).toBe("patch");
  expect(config.fixed).toEqual([packageNames]);
  expect(privatePackages).toEqual({ version: false, tag: false });
  expect(stringArray(config.ignore)).toContain("@glowhop/playground");
});

test("CI validates pull requests and main with pinned actions and minimal permissions", () => {
  const path = ".github/workflows/ci.yml";
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing`);

  const raw = read(path);
  const workflow = parseWorkflow(path);
  const triggers = record(workflow.on);
  const push = record(triggers.push);
  const concurrency = record(workflow.concurrency);

  expect(Object.keys(triggers).sort()).toEqual(["pull_request", "push"]);
  expect(stringArray(push.branches)).toEqual(["main"]);
  expect(workflow.permissions).toEqual({ contents: "read" });
  expect(concurrency["cancel-in-progress"]).toBe(true);
  expect(String(concurrency.group)).toContain("github.workflow");
  expect(String(concurrency.group)).toContain("github.ref");
  expect(workflowUses(raw)).toEqual(actionPins.slice(0, 2));
  expect(raw).toMatch(/bun-version:\s*1\.3\.12/);
  expect(raw).toMatch(/bun install --frozen-lockfile/);

  for (const command of [
    "bun run check",
    "bun run typecheck",
    "bun test",
    "bun run build",
    "bun run pack",
    "bun run test:tarballs",
    "bun run --cwd apps/playground build",
  ]) {
    expect(raw).toContain(command);
  }
});

test("Changesets opens version pull requests from main without publishing", () => {
  const path = ".github/workflows/changesets.yml";
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing`);

  const raw = read(path);
  const workflow = parseWorkflow(path);
  const triggers = record(workflow.on);
  const push = record(triggers.push);

  expect(Object.keys(triggers)).toEqual(["push"]);
  expect(stringArray(push.branches)).toEqual(["main"]);
  expect(workflow.permissions).toEqual({ contents: "write", "pull-requests": "write" });
  expect(workflowUses(raw)).toEqual([actionPins[0], actionPins[1], actionPins[3]]);
  expect(raw).toContain("version-script: bun run version-packages");
  expect(raw).not.toMatch(/npm publish|publish-script/);
});

test("release workflow is GitHub-Release-only and publishes validated built packages in order", () => {
  const path = ".github/workflows/release.yml";
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing`);

  const raw = read(path);
  const workflow = parseWorkflow(path);
  const triggers = record(workflow.on);

  expect(Object.keys(triggers)).toEqual(["release"]);
  expect(stringArray(record(triggers.release).types)).toEqual(["published"]);
  expect(workflow.permissions).toEqual({ contents: "read", "id-token": "write" });
  expect(workflowUses(raw)).toEqual(actionPins.slice(0, 3));
  expect(raw).toContain("RELEASE_PRERELEASE: ${{ github.event.release.prerelease }}");
  expect(raw).toContain('[[ "$RELEASE_PRERELEASE" != "false" ]]');
  expect(raw).toMatch(/\^v\(\[0-9\]\+\)\\\.\(\[0-9\]\+\)\\\.\(\[0-9\]\+\)\$/);
  expect(raw).toContain("bun run release:prepare -- --expected-version");
  expect(raw).toMatch(/node-version:\s*22\.14\.0/);
  expect(raw).toMatch(/npm --version/);
  expect(raw).toContain("npm install --global npm@11.5.1");
  expect(raw).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);

  const publishCommands = [
    ...raw.matchAll(/^\s*run:\s+npm publish (\.\/packages\/(\w+)\/dist) --access public$/gm),
  ];
  expect(publishCommands.map((match) => match[2])).toEqual(packageIds);
  expect(raw).not.toContain("workflow_dispatch");
  expect(raw).not.toMatch(/^\s*push:/m);
  expect(raw).not.toMatch(/^\s*pull_request:/m);
});

test("ordinary local scripts contain no npm publish and retain a non-publishing release dry-run", () => {
  const manifest = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

  expect(manifest.scripts.changeset).toBe("changeset");
  expect(manifest.scripts["version-packages"]).toBe("changeset version");
  expect(manifest.scripts["release:prepare"]).toBe("bun scripts/prepare-release.ts --dry-run");
  expect(Object.values(manifest.scripts).join("\n")).not.toMatch(/npm publish/);
});
