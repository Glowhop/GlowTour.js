import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type PackageId = "core" | "react" | "vue" | "solid" | "vanilla";

type PackageBuild = {
  id: PackageId;
  entrypoint: string;
};

const root = resolve(import.meta.dir, "..");
const packageRoot = join(root, "packages");
const packageBuilds: readonly PackageBuild[] = [
  { id: "core", entrypoint: "src/index.ts" },
  { id: "react", entrypoint: "src/index.ts" },
  { id: "vue", entrypoint: "src/index.ts" },
  { id: "solid", entrypoint: "src/index.ts" },
  { id: "vanilla", entrypoint: "src/index.ts" },
];
const externalPackages = [
  "@angular/common",
  "@angular/core",
  "@glowhop/core-tour",
  "@glowhop/observables",
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

function buildManifest(packageDirectory: string) {
  const source = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as Record<
    string,
    unknown
  >;
  const manifest = {
    ...source,
    files: ["**/*"],
    exports: preparePublishedValue(source.exports),
    sideEffects: source.name === "@glowhop/styles-tour" ? ["*.css"] : source.name === "@glowhop/vanilla-tour",
    types: preparePublishedValue(source.types),
  };

  delete manifest.devDependencies;
  delete manifest.scripts;
  const publishedManifest = preparePublishedValue(manifest);
  writeFileSync(
    join(packageDirectory, "dist", "package.json"),
    `${JSON.stringify(publishedManifest, null, 2)}\n`,
  );
}

function preparePublishedValue(value: unknown): unknown {
  if (typeof value === "string") return value.replace("./dist/", "./").replace("workspace:*", "0.1.0");
  if (Array.isArray(value)) return value.map(preparePublishedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, preparePublishedValue(nestedValue)]),
    );
  }
  return value;
}

async function buildPackage(build: PackageBuild) {
  const directory = join(packageRoot, build.id);
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  mkdirSync(distDirectory, { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(directory, build.entrypoint)],
    external: externalPackages,
    format: "esm",
    outdir: distDirectory,
    target: "browser",
  });
  if (!result.success) {
    throw new Error(`Bun build failed for @glowhop/${build.id}-tour`);
  }

  run("bunx", ["tsc", "--project", join("packages", build.id, "tsconfig.build.json")]);
  buildManifest(directory);
}

function buildStyles() {
  const directory = join(packageRoot, "styles");
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  mkdirSync(distDirectory, { recursive: true });
  cpSync(join(directory, "default.css"), join(distDirectory, "default.css"));
  buildManifest(directory);
}

function buildAngular() {
  const directory = join(packageRoot, "angular");
  const distDirectory = join(directory, "dist");
  rmSync(distDirectory, { force: true, recursive: true });
  run("bunx", ["ng-packagr", "--project", "packages/angular/ng-package.json"]);
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
