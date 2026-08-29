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
const repositoryUrl = "git+https://github.com/Glowhop/glow-tour.git";
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

function objectArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(record);
  throw new Error("expected an object array");
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

test("source manifests contain the repository metadata required for trusted publishing", () => {
  for (const packageId of packageIds) {
    const manifest = JSON.parse(read(`packages/${packageId}/package.json`)) as Record<string, unknown>;
    expect(manifest.repository).toEqual({
      directory: `packages/${packageId}`,
      type: "git",
      url: repositoryUrl,
    });
  }
});

test("source manifests contain complete public npm metadata and preserve required side effects", () => {
  const expectedSideEffects: Record<string, unknown> = {
    core: undefined,
    styles: ["*.css"],
    react: undefined,
    vue: undefined,
    angular: undefined,
    solid: undefined,
    vanilla: ["./dist/auto.js"],
  };

  for (const packageId of packageIds) {
    const manifest = JSON.parse(read(`packages/${packageId}/package.json`)) as Record<string, unknown>;
    expect(manifest.description).toBeString();
    expect(manifest.license).toBe("MIT");
    expect(manifest.homepage).toBe("https://github.com/Glowhop/glow-tour#readme");
    expect(manifest.bugs).toEqual({ url: "https://github.com/Glowhop/glow-tour/issues" });
    expect(manifest.keywords).toBeArray();
    expect(manifest.engines).toEqual({ node: ">=18.19.1" });
    expect(manifest.files).toEqual(["dist/**/*"]);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.sideEffects).toEqual(expectedSideEffects[packageId]);
  }
});

test("the Vanilla package exposes separate pure and auto registration entries", () => {
  const manifest = JSON.parse(read("packages/vanilla/package.json")) as Record<string, unknown>;
  expect(manifest.exports).toEqual({
    ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
    "./auto": { import: "./dist/auto.js", types: "./dist/auto.d.ts" },
  });
});

test("package builds copy shared documents and prefer package changelogs", () => {
  const buildScript = read("scripts/build-packages.ts");
  expect(buildScript).toContain('"README.md"');
  expect(buildScript).toContain('"LICENSE"');
  expect(buildScript).toContain('join(packageDirectory, "CHANGELOG.md")');
  expect(buildScript).toContain('join(root, "CHANGELOG.md")');
});

test("the published README links only to packaged files or absolute repository URLs", () => {
  const readme = read("README.md");
  const relativeLinks = [...readme.matchAll(/\[[^\]]+\]\((?!https?:\/\/|#)([^)]+)\)/g)].map(
    (match) => match[1],
  );
  expect(relativeLinks).toEqual([]);
});

test("the private playground stays outside all package build, pack, release, and tarball sets", () => {
  const playground = JSON.parse(read("apps/playground/package.json")) as { private?: boolean };
  const buildScript = read("scripts/build-packages.ts");
  const packScript = read("scripts/pack-packages.ts");
  const tarballScript = read("scripts/test-tarballs.ts");
  const publishScript = read("scripts/publish-release.ts");

  expect(playground.private).toBe(true);
  expect(stringArray(record(JSON.parse(read(".changeset/config.json"))).ignore)).toContain(
    "@glowhop/playground",
  );
  for (const script of [buildScript, packScript, tarballScript, publishScript]) {
    expect(script).not.toContain("playground");
  }
  expect(packScript).toContain('const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"]');
  expect(tarballScript).not.toContain("@glowhop/playground");
});

test("adapter declaration builds exclude browser acceptance sources", () => {
  for (const packageId of ["react", "vue", "solid", "vanilla"] as const) {
    const config = JSON.parse(read(`packages/${packageId}/tsconfig.build.json`)) as {
      exclude?: string[];
    };
    expect(config.exclude).toContain("src/**/*.browser.ts");
  }
});

test("Core keeps obsolete animation and highlight contracts out of its public surface", () => {
  expect(existsSync(join(root, "packages/core/src/utils/animations.ts"))).toBe(false);
  const publicSurface = `${read("packages/core/src/index.ts")}\n${read(
    "packages/core/src/types/index.ts",
  )}`;
  for (const obsoleteName of [
    "GlowTourElementName",
    "HighlightOptions",
    "HighlightStepOverrides",
    "ViewportDimensions",
    "WorkflowHighlightOptions",
  ]) {
    expect(publicSurface).not.toContain(obsoleteName);
  }
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
    "bun run test:browser",
    "bun run build",
    "bun run pack",
    "bun run test:tarballs",
    "bun run --cwd apps/playground build",
  ]) {
    expect(raw).toContain(command);
  }
  expect(raw.indexOf("bun test")).toBeLessThan(raw.indexOf("bun run test:browser"));
  expect(raw.indexOf("bun run test:browser")).toBeLessThan(raw.indexOf("bun run build"));
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

test("release workflow is GitHub-Release-only and delegates resumable publishing", () => {
  const path = ".github/workflows/release.yml";
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing`);

  const raw = read(path);
  const workflow = parseWorkflow(path);
  const triggers = record(workflow.on);

  expect(Object.keys(triggers)).toEqual(["release"]);
  expect(stringArray(record(triggers.release).types)).toEqual(["published"]);
  expect(workflow.permissions).toEqual({ contents: "read", "id-token": "write" });
  expect(workflowUses(raw)).toEqual(actionPins.slice(0, 3));
  const steps = objectArray(record(record(workflow.jobs).publish).steps);
  const checkout = steps.find((step) => step.name === "Check out repository");
  expect(record(checkout).with).toEqual({ "fetch-depth": 0, "persist-credentials": false });
  expect(raw).toContain("RELEASE_PRERELEASE: ${{ github.event.release.prerelease }}");
  expect(raw).toContain('[[ "$RELEASE_PRERELEASE" != "false" ]]');
  expect(raw).toMatch(/\^v\(\[0-9\]\+\)\\\.\(\[0-9\]\+\)\\\.\(\[0-9\]\+\)\$/);
  expect(raw).toContain("bun run release:prepare -- --expected-version");
  expect(raw).toContain("bun run test:browser");
  expect(raw.indexOf("bun test")).toBeLessThan(raw.indexOf("bun run test:browser"));
  expect(raw.indexOf("bun run test:browser")).toBeLessThan(raw.indexOf("bun run build"));
  expect(raw).toMatch(/node-version:\s*22\.14\.0/);
  expect(raw).toMatch(/npm --version/);
  expect(raw).toContain("npm install --global npm@11.5.1");
  expect(raw).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);

  expect(raw).toContain("bun run release:publish");
  expect(raw).not.toMatch(/npm publish/);
  expect(raw).toContain('bun scripts/release-ancestry.ts "$GITHUB_SHA"');
  expect(raw.indexOf("release-ancestry.ts")).toBeLessThan(raw.indexOf("bun run release:publish"));
  expect(raw).not.toContain("workflow_dispatch");
  expect(raw).not.toMatch(/^\s*push:/m);
  expect(raw).not.toMatch(/^\s*pull_request:/m);
});

test("ordinary local scripts contain no npm publish and retain a non-publishing release dry-run", () => {
  const manifest = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

  expect(manifest.scripts.changeset).toBe("changeset");
  expect(manifest.scripts["version-packages"]).toBe("changeset version");
  expect(manifest.scripts["release:prepare"]).toBe("bun scripts/prepare-release.ts --dry-run");
  expect(manifest.scripts["release:publish"]).toBe("bun scripts/publish-release.ts");
  expect(manifest.scripts["test:browser"]).toBe("bun scripts/test-browser.ts");
  const browserRunner = read("scripts/test-browser.ts");
  expect(browserRunner).toContain('"./packages/react/src/react.browser.ts"');
  expect(browserRunner).toContain('"./packages/solid/src/solid.browser.ts"');
  expect(browserRunner).toContain('"./packages/vue/src/vue.browser.ts"');
  expect(browserRunner).toContain('"./packages/angular/src/angular.browser.ts"');
  expect(browserRunner).toContain('"./packages/vanilla/src/vanilla.browser.ts"');
  expect(browserRunner.indexOf("react.browser.ts")).toBeLessThan(
    browserRunner.indexOf("solid.browser.ts"),
  );
  expect(browserRunner.indexOf("solid.browser.ts")).toBeLessThan(
    browserRunner.indexOf("vue.browser.ts"),
  );
  expect(browserRunner.indexOf("vue.browser.ts")).toBeLessThan(
    browserRunner.indexOf("angular.browser.ts"),
  );
  expect(browserRunner.indexOf("angular.browser.ts")).toBeLessThan(
    browserRunner.indexOf("vanilla.browser.ts"),
  );
  expect(browserRunner).toContain("Bun.spawnSync");
  expect(browserRunner).toContain("process.exitCode = result.exitCode");
  expect(Object.values(manifest.scripts).join("\n")).not.toMatch(/npm publish/);
});
