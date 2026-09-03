import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildPublishedManifest, type PackageManifest } from "./package-manifests";

type PackageId = "core" | "react" | "vue" | "solid" | "vanilla";

type PackageBuild = {
  id: PackageId;
  entrypoints: readonly string[];
  preserveModules?: boolean;
};

const root = resolve(import.meta.dir, "..");
const packageRoot = join(root, "packages");
const sharedReleaseDocuments = ["LICENSE"] as const;
const packageBuilds: readonly PackageBuild[] = [
  { id: "core", entrypoints: ["src/index.ts", "src/adapter.ts"] },
  { id: "react", entrypoints: ["src/index.ts"] },
  {
    id: "vue",
    entrypoints: [
      "src/index.ts",
      "src/glow-tour.ts",
      "src/components/default-tour.ts",
      "src/components/tour-components.ts",
    ],
    preserveModules: true,
  },
  { id: "solid", entrypoints: ["src/index.ts"] },
  { id: "vanilla", entrypoints: ["src/index.ts", "src/auto.ts"] },
];
const externalPackages = [
  "@angular/common",
  "@angular/core",
  "@glowhop/core-tour",
  "@glowhop/react-observables",
  "react",
  "solid-js",
  "solid-js/*",
  "vue",
];

function run(command: string, args: readonly string[]) {
  const result = Bun.spawnSync([command, ...args], { cwd: root, stderr: "pipe", stdout: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function readSourceManifest(packageDirectory: string): PackageManifest {
  return JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as PackageManifest;
}

const workspaceVersions = Object.fromEntries(
  ["core", "styles", "react", "vue", "angular", "solid", "vanilla"].map((packageId) => {
    const source = readSourceManifest(join(packageRoot, packageId));
    return [source.name, source.version];
  }),
);

function buildManifest(packageDirectory: string) {
  const source = readSourceManifest(packageDirectory);
  const publishedManifest = buildPublishedManifest(source, workspaceVersions);
  writeFileSync(
    join(packageDirectory, "dist", "package.json"),
    `${JSON.stringify(publishedManifest, null, 2)}\n`,
  );
}

function copyReleaseDocuments(packageDirectory: string, distDirectory: string) {
  const packageReadme = join(packageDirectory, "README.md");
  if (!existsSync(packageReadme)) {
    throw new Error(`Missing package README: ${packageReadme}`);
  }
  copyFileSync(packageReadme, join(distDirectory, "README.md"));
  for (const document of sharedReleaseDocuments) {
    copyFileSync(join(root, document), join(distDirectory, document));
  }
  const packageChangelog = join(packageDirectory, "CHANGELOG.md");
  const changelog = existsSync(packageChangelog) ? packageChangelog : join(root, "CHANGELOG.md");
  copyFileSync(changelog, join(distDirectory, "CHANGELOG.md"));
}

async function buildPackage(build: PackageBuild) {
  const directory = join(packageRoot, build.id);
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  mkdirSync(distDirectory, { recursive: true });

  const result = await Bun.build({
    entrypoints: build.entrypoints.map((entrypoint) => join(directory, entrypoint)),
    external: [
      ...externalPackages,
      ...(build.preserveModules ? ["./*", "../*"] : []),
    ],
    format: "esm",
    ignoreDCEAnnotations: true,
    outdir: distDirectory,
    target: "browser",
  });
  if (!result.success) {
    throw new Error(`Bun build failed for @glowhop/${build.id}-tour`);
  }

  run("bunx", ["tsc", "--project", join("packages", build.id, "tsconfig.build.json")]);
  copyReleaseDocuments(directory, distDirectory);
  buildManifest(directory);
}

function buildStyles() {
  const directory = join(packageRoot, "styles");
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  mkdirSync(distDirectory, { recursive: true });
  cpSync(join(directory, "default.css"), join(distDirectory, "default.css"));
  cpSync(join(directory, "default.css.d.ts"), join(distDirectory, "default.css.d.ts"));
  copyReleaseDocuments(directory, distDirectory);
  buildManifest(directory);
}

function buildAngular() {
  const directory = join(packageRoot, "angular");
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  run("bunx", [
    "ng-packagr",
    "--project",
    "packages/angular/ng-package.json",
    "--config",
    "packages/angular/tsconfig.ngc.json",
  ]);
  copyReleaseDocuments(directory, distDirectory);
  buildManifest(directory);
}

for (const build of packageBuilds.slice(0, 1)) {
  await buildPackage(build);
}
buildStyles();
for (const build of packageBuilds.slice(1, 3)) {
  await buildPackage(build);
}
buildAngular();
for (const build of packageBuilds.slice(3)) {
  await buildPackage(build);
}

if (!existsSync(join(packageRoot, "angular", "dist", "fesm2022", "glowhop-angular-tour.mjs"))) {
  throw new Error("Angular APF output is missing its fesm2022 entrypoint");
}

console.log("Built publishable distributions for 7 packages.");
