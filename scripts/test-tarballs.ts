import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type PackageName =
  | "@glowhop/angular-tour"
  | "@glowhop/core-tour"
  | "@glowhop/react-tour"
  | "@glowhop/solid-tour"
  | "@glowhop/styles-tour"
  | "@glowhop/vanilla-tour"
  | "@glowhop/vue-tour";

const root = resolve(import.meta.dir, "..");
const tarballDirectory = join(root, ".artifacts", "tarballs");
const packageNames: readonly PackageName[] = [
  "@glowhop/core-tour",
  "@glowhop/styles-tour",
  "@glowhop/react-tour",
  "@glowhop/vue-tour",
  "@glowhop/angular-tour",
  "@glowhop/solid-tour",
  "@glowhop/vanilla-tour",
];

function run(command: string, args: readonly string[], cwd = root): string {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    env: { ...process.env, npm_config_cache: join(cwd, ".npm-cache") },
    stderr: "pipe",
    stdout: "pipe",
  });
  const output = `${result.stdout.toString()}${result.stderr.toString()}`;
  assert.equal(result.exitCode, 0, `${command} ${args.join(" ")} failed:\n${output}`);
  return output;
}

function tarballFor(packageName: PackageName): string {
  const packageStem = packageName.replace("@glowhop/", "glowhop-");
  const tarball = readdirSync(tarballDirectory).find(
    (fileName) => fileName.startsWith(`${packageStem}-`) && fileName.endsWith(".tgz"),
  );
  assert.ok(tarball, `missing tarball for ${packageName}`);
  return join(tarballDirectory, tarball);
}

function readPackedManifest(tarball: string): Record<string, unknown> {
  return JSON.parse(run("tar", ["-xOzf", tarball, "package/package.json"])) as Record<string, unknown>;
}

function assertPackedArtifact(packageName: PackageName) {
  const tarball = tarballFor(packageName);
  const contents = run("tar", ["-tzf", tarball]);
  const manifest = readPackedManifest(tarball);

  assert.equal(manifest.name, packageName);
  assert.equal(manifest.type, "module");
  assert.deepEqual(manifest.files, ["**/*"]);
  assert.deepEqual(manifest.repository, {
    directory: `packages/${packageName.replace("@glowhop/", "").replace("-tour", "")}`,
    type: "git",
    url: "git+https://github.com/Glowhop/glow-tour.git",
  });
  assert.match(JSON.stringify(manifest), /"exports"/);
  assert.doesNotMatch(JSON.stringify(manifest), /workspace:\*/);
  assert.doesNotMatch(JSON.stringify(manifest), /["']\.\/src\//);
  assert.doesNotMatch(contents, /package\/src\//);
  assert.doesNotMatch(contents, /(?<!\.d)\.ts$/m);
  if (packageName === "@glowhop/styles-tour") {
    assert.match(contents, /package\/default\.css$/m);
    assert.match(contents, /package\/default\.css\.d\.ts$/m);
  }
}

function writeConsumerFixture(directory: string) {
  const dependencies = Object.fromEntries(
    packageNames.map((packageName) => [packageName, `file:${tarballFor(packageName)}`]),
  );

  writeFileSync(
    join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: "glow-tour-tarball-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...dependencies,
          "@angular/common": "18.2.13",
          "@angular/compiler": "18.2.13",
          "@angular/core": "18.2.13",
          "@angular/platform-browser": "18.2.13",
          react: "19.1.1",
          "solid-js": "^1.9.14",
          vue: "3.5.22",
        },
        devDependencies: {
          "@types/node": "22.18.6",
          "@types/react": "19.1.16",
          "@angular/compiler-cli": "18.2.13",
          typescript: "5.5.4",
          "typescript-side-effect-checks": "npm:typescript@5.7.3",
          vite: "6.4.3",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(directory, "css-entry.ts"),
    'import "@glowhop/styles-tour/default.css";\n',
  );
  writeFileSync(
    join(directory, "vite.config.mts"),
    `import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: { entry: "./css-entry.ts", formats: ["es"] },
    outDir: "css-dist",
  },
});
`,
  );
  writeFileSync(
    join(directory, "runtime-imports.mjs"),
    `import assert from "node:assert/strict";
import { create } from "@glowhop/core-tour";
import { GlowTour as ReactGlowTour } from "@glowhop/react-tour";
import { GlowTourRoot as VueGlowTourRoot } from "@glowhop/vue-tour";
import { GlowTour as SolidGlowTour } from "@glowhop/solid-tour";
import { registerGlowTourElements } from "@glowhop/vanilla-tour";

assert.equal(typeof create, "function");
assert.equal(typeof ReactGlowTour.Root, "function");
assert.equal(typeof VueGlowTourRoot, "object");
assert.equal(typeof SolidGlowTour.Root, "function");
assert.equal(typeof registerGlowTourElements, "function");
`,
  );
  writeFileSync(
    join(directory, "consumer.ts"),
    `import { create } from "@glowhop/core-tour";
import "@glowhop/styles-tour/default.css";
import { GlowTour as ReactGlowTour } from "@glowhop/react-tour";
import { GlowTourRoot as VueGlowTourRoot } from "@glowhop/vue-tour";
import { GlowTourRoot as AngularGlowTourRoot } from "@glowhop/angular-tour";
import { GlowTour as SolidGlowTour } from "@glowhop/solid-tour";
import { registerGlowTourElements } from "@glowhop/vanilla-tour";

void create("tarball-consumer");
void ReactGlowTour;
void VueGlowTourRoot;
void AngularGlowTourRoot;
void SolidGlowTour;
void registerGlowTourElements;
`,
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          noUncheckedSideEffectImports: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        files: ["consumer.ts"],
      },
      null,
      2,
    )}\n`,
  );
  const angularDirectory = join(directory, "angular-app");
  mkdirSync(angularDirectory);
  writeFileSync(
    join(angularDirectory, "main.ts"),
    `import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { GlowTourRoot } from "@glowhop/angular-tour";

@Component({
  imports: [GlowTourRoot],
  selector: "tarball-angular-app",
  standalone: true,
  template: "<glow-tour-root />",
})
export class TarballAngularApp {}

void bootstrapApplication(TarballAngularApp);
`,
  );
  writeFileSync(
    join(angularDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "ES2022",
          moduleResolution: "Bundler",
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        angularCompilerOptions: {
          strictTemplates: true,
        },
        files: ["main.ts"],
      },
      null,
      2,
    )}\n`,
  );
}

assert.ok(existsSync(tarballDirectory), "run bun run pack before bun run test:tarballs");

for (const packageName of packageNames) {
  assertPackedArtifact(packageName);
}

const consumerDirectory = mkdtempSync(join(tmpdir(), "glow-tour-tarball-consumer-"));
try {
  writeConsumerFixture(consumerDirectory);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"], consumerDirectory);
  run("node", ["runtime-imports.mjs"], consumerDirectory);
  run(
    "node",
    ["node_modules/typescript-side-effect-checks/bin/tsc", "--project", "tsconfig.json"],
    consumerDirectory,
  );
  run("npx", ["vite", "build"], consumerDirectory);
  const cssOutput = readdirSync(join(consumerDirectory, "css-dist"), { recursive: true }).find((fileName) =>
    fileName.endsWith(".css"),
  );
  assert.ok(cssOutput, "Vite did not bundle the packaged stylesheet");
  run("npx", ["ngc", "--project", "angular-app/tsconfig.json"], consumerDirectory);
} finally {
  rmSync(consumerDirectory, { force: true, recursive: true });
}

console.log(`Tarball smoke contract passed for ${packageNames.length} packages.`);
