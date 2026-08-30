import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { basename, join, resolve } from "node:path";

type BundleResult = {
  gzipBytes: number;
  inputs: readonly string[];
  output: string;
};

export type BundleScenario = {
  readonly entry: string;
  readonly externalPackages: readonly string[];
  readonly gzipBudget: number;
  readonly name: string;
  readonly outputExtension: "css" | "js";
  readonly requiresAutoRegistration?: boolean;
  readonly requiresPrunedPresentation?: boolean;
  readonly requiresPureVanillaMain?: boolean;
};

const KIB = 1024;
const packageNames = [
  "@glowhop/core-tour",
  "@glowhop/styles-tour",
  "@glowhop/react-tour",
  "@glowhop/vue-tour",
  "@glowhop/angular-tour",
  "@glowhop/solid-tour",
  "@glowhop/vanilla-tour",
] as const;
const frameworkInput = /node_modules\/(?:@angular\/|react\/|solid-js\/|vue\/)/;

export const bundleScenarios: readonly BundleScenario[] = [
  {
    entry: 'import { createGlowTour } from "@glowhop/core-tour"; createGlowTour();',
    externalPackages: ["@glowhop/observables"],
    gzipBudget: 18 * KIB,
    name: "Core index",
    outputExtension: "js",
  },
  {
    entry: 'export { connectGlowTourRoot } from "@glowhop/core-tour/adapter";',
    externalPackages: [],
    gzipBudget: 0.75 * KIB,
    name: "Core adapter",
    outputExtension: "js",
  },
  {
    entry: 'import { createGlowTour } from "@glowhop/react-tour"; createGlowTour();',
    externalPackages: ["@glowhop/core-tour", "react", "react/*"],
    gzipBudget: 2.5 * KIB,
    name: "React",
    outputExtension: "js",
    requiresPrunedPresentation: true,
  },
  {
    entry: 'import { createGlowTour } from "@glowhop/vue-tour"; createGlowTour();',
    externalPackages: ["@glowhop/core-tour", "vue", "vue/*"],
    gzipBudget: 2.75 * KIB,
    name: "Vue",
    outputExtension: "js",
    requiresPrunedPresentation: true,
  },
  {
    entry: 'import { createGlowTour } from "@glowhop/angular-tour"; createGlowTour();',
    externalPackages: [
      "@angular/common",
      "@angular/common/*",
      "@angular/core",
      "@angular/core/*",
      "@glowhop/core-tour",
      "@glowhop/core-tour/*",
      "tslib",
    ],
    gzipBudget: 4.5 * KIB,
    name: "Angular",
    outputExtension: "js",
    // Angular's partial-compiled FESM is linked by the consumer's Angular toolchain.
    // Raw esbuild runs before that linker, so the immutable FESM budget is the stable proxy here.
  },
  {
    entry: 'import { createGlowTour } from "@glowhop/solid-tour"; createGlowTour();',
    externalPackages: ["@glowhop/core-tour", "solid-js", "solid-js/*"],
    gzipBudget: 2.5 * KIB,
    name: "Solid",
    outputExtension: "js",
    requiresPrunedPresentation: true,
  },
  {
    entry: 'import { createGlowTour } from "@glowhop/vanilla-tour"; createGlowTour();',
    externalPackages: ["@glowhop/core-tour"],
    gzipBudget: 4.5 * KIB,
    name: "Vanilla main",
    outputExtension: "js",
    requiresPureVanillaMain: true,
  },
  {
    entry: 'import "@glowhop/vanilla-tour/auto";',
    externalPackages: ["@glowhop/core-tour"],
    gzipBudget: 4.75 * KIB,
    name: "Vanilla /auto",
    outputExtension: "js",
    requiresAutoRegistration: true,
  },
  {
    entry: 'import "@glowhop/styles-tour/default.css";',
    externalPackages: [],
    gzipBudget: 1.75 * KIB,
    name: "Styles CSS",
    outputExtension: "css",
  },
];

export function assertBundleScenario(scenario: BundleScenario, result: BundleResult) {
  const delta = result.gzipBytes - scenario.gzipBudget;
  assert.ok(
    delta <= 0,
    `${scenario.name}: gzip ${result.gzipBytes} B exceeds ${scenario.gzipBudget} B by ${delta} B`,
  );
  assert.equal(
    result.inputs.some((input) => frameworkInput.test(input)),
    false,
    `${scenario.name} must not bundle another framework`,
  );
  if (scenario.requiresPrunedPresentation) {
    assert.equal(
      result.output.includes("data-glow-tour"),
      false,
      `${scenario.name} targeted createGlowTour import must prune presentation components`,
    );
  }
  if (scenario.requiresPureVanillaMain) {
    assert.equal(
      result.output.includes("customElements"),
      false,
      "Vanilla main must not register custom elements",
    );
  }
  if (scenario.requiresAutoRegistration) {
    assert.ok(
      result.output.includes("glow-tour-root") && /\.define\(/.test(result.output),
      "Vanilla /auto must retain custom-element registration",
    );
  }
}

export function esbuildArguments(
  scenario: BundleScenario,
  entry: string,
  output: string,
  metafile: string,
): string[] {
  return [
    entry,
    "--bundle",
    "--format=esm",
    "--minify",
    "--platform=browser",
    "--target=es2022",
    `--outfile=${output}`,
    `--metafile=${metafile}`,
    ...scenario.externalPackages.map((packageName) => `--external:${packageName}`),
  ];
}

export function formatBundleMeasurement(scenario: BundleScenario, gzipBytes: number): string {
  const delta = gzipBytes - scenario.gzipBudget;
  return `${scenario.name}: ${gzipBytes} B / ${scenario.gzipBudget} B (${delta >= 0 ? "+" : ""}${delta} B)`;
}

function run(command: string, args: readonly string[], cwd: string) {
  const result = Bun.spawnSync([command, ...args], { cwd, stderr: "pipe", stdout: "pipe" });
  const output = `${result.stdout.toString()}${result.stderr.toString()}`;
  assert.equal(result.exitCode, 0, `${command} ${args.join(" ")} failed:\n${output}`);
}

function verifyInstalledTarballs(consumerDirectory: string) {
  assert.match(
    basename(consumerDirectory),
    /^glow-tour-tarball-consumer-/,
    "bundle verifier must run in the temporary tarball consumer",
  );
  for (const packageName of packageNames) {
    const manifestPath = join(consumerDirectory, "node_modules", packageName, "package.json");
    assert.ok(existsSync(manifestPath), `missing installed tarball for ${packageName}`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { name?: unknown };
    assert.equal(manifest.name, packageName, `wrong package installed for ${packageName}`);
  }
}

function verifyBundles(consumerDirectory: string) {
  verifyInstalledTarballs(consumerDirectory);
  const esbuild = join(consumerDirectory, "node_modules", ".bin", "esbuild");
  assert.ok(existsSync(esbuild), "temporary consumer must provide esbuild through Vite");
  const outputDirectory = mkdtempSync(join(consumerDirectory, ".glow-tour-bundles-"));
  try {
    for (const [index, scenario] of bundleScenarios.entries()) {
      const entry = join(outputDirectory, `${index}.ts`);
      const output = join(outputDirectory, `${index}.js`);
      const metafile = join(outputDirectory, `${index}.meta.json`);
      writeFileSync(entry, `${scenario.entry}\n`);
      run(
        esbuild,
        esbuildArguments(scenario, entry, output, metafile),
        consumerDirectory,
      );
      const outputPath = output.replace(/\.js$/, `.${scenario.outputExtension}`);
      const bundle = readFileSync(outputPath);
      const metadata = JSON.parse(readFileSync(metafile, "utf8")) as {
        inputs: Record<string, unknown>;
      };
      const gzipBytes = gzipSync(bundle).byteLength;
      console.log(formatBundleMeasurement(scenario, gzipBytes));
      assertBundleScenario(scenario, {
        gzipBytes,
        inputs: Object.keys(metadata.inputs),
        output: bundle.toString("utf8"),
      });
    }
  } finally {
    rmSync(outputDirectory, { force: true, recursive: true });
  }
}

const consumerDirectory = process.argv[2];
if (consumerDirectory) verifyBundles(resolve(consumerDirectory));
