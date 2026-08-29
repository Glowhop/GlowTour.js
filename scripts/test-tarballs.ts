import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
const consumerPeerDependencies: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "@glowhop/react-tour": { react: "^19.0.0" },
  "@glowhop/vue-tour": { vue: "^3.5.0" },
  "@glowhop/angular-tour": {
    "@angular/common": "^18.2.0",
    "@angular/core": "^18.2.0",
  },
  "@glowhop/solid-tour": { "solid-js": "^1.9.14" },
};

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

function localTarballDependencies(dependencies: Record<string, string>) {
  for (const packageName of packageNames) {
    assert.equal(
      dependencies[packageName],
      `file:${tarballFor(packageName)}`,
      `${packageName} must be installed from its local tarball`,
    );
  }
}

function readPackedManifest(tarball: string): Record<string, unknown> {
  return JSON.parse(run("tar", ["-xOzf", tarball, "package/package.json"])) as Record<string, unknown>;
}

function assertPackedArtifact(packageName: PackageName) {
  const tarball = tarballFor(packageName);
  const contents = run("tar", ["-tzf", tarball]);
  const manifest = readPackedManifest(tarball);
  const packageId = packageName.replace("@glowhop/", "").replace("-tour", "");
  const packageChangelog = join(root, "packages", packageId, "CHANGELOG.md");
  const expectedChangelog = readFileSync(
    existsSync(packageChangelog) ? packageChangelog : join(root, "CHANGELOG.md"),
    "utf8",
  );

  assert.equal(manifest.name, packageName);
  assert.equal(manifest.type, "module");
  assert.deepEqual(manifest.files, ["**/*"]);
  assert.ok(
    typeof manifest.description === "string" && manifest.description.length > 0,
    `${packageName} must keep its description`,
  );
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.homepage, "https://github.com/Glowhop/glow-tour#readme");
  assert.deepEqual(manifest.bugs, { url: "https://github.com/Glowhop/glow-tour/issues" });
  assert.ok(
    Array.isArray(manifest.keywords) &&
      manifest.keywords.length > 0 &&
      manifest.keywords.every((keyword) => typeof keyword === "string"),
    `${packageName} must keep its keywords`,
  );
  assert.deepEqual(manifest.engines, { node: ">=18.19.1" });
  assert.deepEqual(manifest.publishConfig, { access: "public" });
  assert.deepEqual(
    manifest.sideEffects,
    packageName === "@glowhop/styles-tour"
      ? ["*.css"]
      : packageName === "@glowhop/vanilla-tour",
  );
  assert.deepEqual(manifest.repository, {
    directory: `packages/${packageName.replace("@glowhop/", "").replace("-tour", "")}`,
    type: "git",
    url: "git+https://github.com/Glowhop/glow-tour.git",
  });
  assert.match(JSON.stringify(manifest), /"exports"/);
  assert.equal("devDependencies" in manifest, false);
  assert.equal("scripts" in manifest, false);
  assert.deepEqual(
    manifest.peerDependencies ?? {},
    consumerPeerDependencies[packageName] ?? {},
    `${packageName} packed peerDependencies must match the consumer contract`,
  );
  assert.doesNotMatch(JSON.stringify(manifest), /workspace:\*/);
  assert.doesNotMatch(JSON.stringify(manifest), /["']\.\/src\//);
  assert.doesNotMatch(contents, /package\/src\//);
  assert.doesNotMatch(contents, /(?<!\.d)\.ts$/m);
  assert.match(contents, /package\/README\.md$/m);
  assert.match(contents, /package\/LICENSE$/m);
  assert.match(contents, /package\/CHANGELOG\.md$/m);
  assert.equal(
    run("tar", ["-xOzf", tarball, "package/CHANGELOG.md"]),
    expectedChangelog,
    `${packageName} must publish its package changelog, falling back to the root bootstrap changelog`,
  );
  if (packageName === "@glowhop/styles-tour") {
    assert.match(contents, /package\/default\.css$/m);
    assert.match(contents, /package\/default\.css\.d\.ts$/m);
  }
  if (packageName === "@glowhop/core-tour") {
    assert.match(contents, /package\/adapter\.js$/m);
    assert.match(contents, /package\/adapter\.d\.ts$/m);
  }
}

function writeConsumerFixture(directory: string) {
  const dependencies = Object.fromEntries(
    packageNames.map((packageName) => [packageName, `file:${tarballFor(packageName)}`]),
  );
  localTarballDependencies(dependencies);

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
          rxjs: "7.8.1",
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
import "@angular/compiler";
import * as CoreTour from "@glowhop/core-tour";
import * as CoreAdapter from "@glowhop/core-tour/adapter";
import {
  DefaultTour as ReactDefaultTour,
  GlowTour as ReactGlowTour,
  createGlowTour as createReactGlowTour,
} from "@glowhop/react-tour";
import { GlowTourDefault as VueGlowTourDefault, GlowTourRoot as VueGlowTourRoot } from "@glowhop/vue-tour";
import { GlowTourDefault as AngularGlowTourDefault, GlowTourRoot as AngularGlowTourRoot } from "@glowhop/angular-tour";
import { DefaultTour as SolidDefaultTour, GlowTour as SolidGlowTour } from "@glowhop/solid-tour";
import { createDefaultTourElement, createGlowTour } from "@glowhop/vanilla-tour";

assert.deepEqual(Object.keys(CoreTour), ["createGlowTour"]);
assert.deepEqual(Object.keys(CoreAdapter), ["connectGlowTourRoot"]);
assert.equal(typeof ReactGlowTour.Root, "function");
assert.equal(typeof ReactDefaultTour, "function");
assert.equal(ReactGlowTour.Default, ReactDefaultTour);
assert.equal(typeof VueGlowTourRoot, "object");
assert.equal(typeof VueGlowTourDefault, "object");
assert.equal(typeof AngularGlowTourRoot, "function");
assert.equal(typeof AngularGlowTourDefault, "function");
assert.equal(typeof SolidGlowTour.Root, "function");
assert.equal(typeof SolidDefaultTour, "function");
assert.equal(SolidGlowTour.Default, SolidDefaultTour);
assert.equal(typeof createGlowTour, "function");
assert.equal(typeof createDefaultTourElement, "function");
`,
  );
  writeFileSync(
    join(directory, "consumer.ts"),
    `import { createGlowTour as createCoreGlowTour } from "@glowhop/core-tour";
import "@glowhop/styles-tour/default.css";
import type {
  DynamicStepProps as ReactDynamicStepProps,
  Tour as ReactTour,
  TourState as ReactTourState,
  WorkflowDefinition as ReactWorkflowDefinition,
} from "@glowhop/react-tour";
import { GlowTour as ReactGlowTour, createGlowTour as createReactGlowTour } from "@glowhop/react-tour";
import type {
  DynamicStepProps as VueDynamicStepProps,
  Tour as VueTour,
  TourState as VueTourState,
  WorkflowDefinition as VueWorkflowDefinition,
} from "@glowhop/vue-tour";
import { GlowTourRoot as VueGlowTourRoot, createGlowTour as createVueGlowTour } from "@glowhop/vue-tour";
import type {
  DynamicStepProps as AngularDynamicStepProps,
  Tour as AngularTour,
  TourState as AngularTourState,
  WorkflowDefinition as AngularWorkflowDefinition,
} from "@glowhop/angular-tour";
import {
  GlowTourRoot as AngularGlowTourRoot,
  createGlowTour as createAngularGlowTour,
} from "@glowhop/angular-tour";
import type {
  DynamicStepProps as SolidDynamicStepProps,
  Tour as SolidTour,
  TourState as SolidTourState,
  WorkflowDefinition as SolidWorkflowDefinition,
} from "@glowhop/solid-tour";
import {
  GlowTour as SolidGlowTour,
  createGlowTour as createSolidGlowTour,
} from "@glowhop/solid-tour";
import type {
  DynamicStepProps as VanillaDynamicStepProps,
  Tour as VanillaTour,
  TourState as VanillaTourState,
  WorkflowDefinition as VanillaWorkflowDefinition,
} from "@glowhop/vanilla-tour";
import { createGlowTour } from "@glowhop/vanilla-tour";

const reactTour: ReactTour = createReactGlowTour();
const reactState: ReactTourState | null = null;
const reactStep: ReactDynamicStepProps | null = null;
const reactWorkflow: ReactWorkflowDefinition | null = null;
const vueTour: VueTour = createVueGlowTour();
const vueState: VueTourState | null = null;
const vueStep: VueDynamicStepProps | null = null;
const vueWorkflow: VueWorkflowDefinition | null = null;
const angularTour: AngularTour = createAngularGlowTour();
const angularState: AngularTourState | null = null;
const angularStep: AngularDynamicStepProps | null = null;
const angularWorkflow: AngularWorkflowDefinition | null = null;
const solidTour: SolidTour = createSolidGlowTour();
const solidState: SolidTourState | null = null;
const solidStep: SolidDynamicStepProps | null = null;
const solidWorkflow: SolidWorkflowDefinition | null = null;
const vanillaTour: VanillaTour = createGlowTour();
const vanillaState: VanillaTourState | null = null;
const vanillaStep: VanillaDynamicStepProps | null = null;
const vanillaWorkflow: VanillaWorkflowDefinition | null = null;

const workflow = createCoreGlowTour<string>()
  .create("tarball-consumer")
  .step({ content: "Content", target: "#target", title: "Title" })
  .wait(0)
  .do(() => true)
  .beforeAdvance(() => {})
  .build();
void workflow;
void reactTour;
void reactState;
void reactStep;
void reactWorkflow;
void vueTour;
void vueState;
void vueStep;
void vueWorkflow;
void angularTour;
void angularState;
void angularStep;
void angularWorkflow;
void solidTour;
void solidState;
void solidStep;
void solidWorkflow;
void vanillaTour;
void vanillaState;
void vanillaStep;
void vanillaWorkflow;
void ReactGlowTour;
void VueGlowTourRoot;
void AngularGlowTourRoot;
void SolidGlowTour;
void createGlowTour;
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
import { createGlowTour, GlowTourRoot } from "@glowhop/angular-tour";

@Component({
  imports: [GlowTourRoot],
  selector: "tarball-angular-app",
  standalone: true,
  template: '<glow-tour-root [tour]="tour" />',
})
export class TarballAngularApp {
  readonly tour = createGlowTour();
}

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
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ],
    consumerDirectory,
  );
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
