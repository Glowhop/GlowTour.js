import { expect, test } from "bun:test";
import {
  assertBundleScenario,
  bundleScenarios,
  esbuildArguments,
  formatBundleMeasurement,
} from "./verify-bundles";

test("rejects presentation code in a targeted adapter bundle without treating source paths as output", () => {
  const react = bundleScenarios.find((scenario) => scenario.name === "React");
  expect(react).toBeDefined();

  expect(() =>
    assertBundleScenario(react!, {
      gzipBytes: 1,
      inputs: ["node_modules/@glowhop/react-tour/components/tour-components.js"],
      output: 'const marker = "data-glow-tour-root";',
    }),
  ).toThrow("must prune presentation components");

  expect(() =>
    assertBundleScenario(react!, {
      gzipBytes: 1,
      inputs: ["node_modules/@glowhop/react-tour/components/tour-components.js"],
      output: "export { createGlowTour } from '@glowhop/core-tour';",
    }),
  ).not.toThrow();
});

test("requires Vanilla auto bundles to retain registration while the main entry stays pure", () => {
  const main = bundleScenarios.find((scenario) => scenario.name === "Vanilla main");
  const auto = bundleScenarios.find((scenario) => scenario.name === "Vanilla /auto");
  expect(main).toBeDefined();
  expect(auto).toBeDefined();

  expect(() =>
    assertBundleScenario(main!, {
      gzipBytes: 1,
      inputs: [],
      output: "customElements.define('glow-tour-root', Root);",
    }),
  ).toThrow("must not register custom elements");
  expect(() =>
    assertBundleScenario(auto!, { gzipBytes: 1, inputs: [], output: "customElements;" }),
  ).toThrow("must retain custom-element registration");
  expect(() =>
    assertBundleScenario(auto!, {
      gzipBytes: 1,
      inputs: [],
      output: 'customElements.define("glow-tour-root", Root);',
    }),
  ).not.toThrow();
});

test("builds deterministic minified ESM without source maps", () => {
  const scenario = bundleScenarios.find((candidate) => candidate.name === "React");
  expect(scenario).toBeDefined();
  const arguments_ = esbuildArguments(scenario!, "entry.ts", "output.js", "metadata.json");

  expect(arguments_).toContain("--bundle");
  expect(arguments_).toContain("--format=esm");
  expect(arguments_).toContain("--minify");
  expect(arguments_).not.toContain("--sourcemap");
  expect(arguments_).not.toContain("--sourcemap=false");
});

test("bundles Core itself without externalizing its removed observables dependency", () => {
  const core = bundleScenarios.find((scenario) => scenario.name === "Core index");
  const react = bundleScenarios.find((scenario) => scenario.name === "React");
  expect(core).toBeDefined();
  expect(react).toBeDefined();

  const coreArguments = esbuildArguments(core!, "entry.ts", "output.js", "metadata.json");
  const reactArguments = esbuildArguments(react!, "entry.ts", "output.js", "metadata.json");

  expect(coreArguments).not.toContain("--external:@glowhop/core-tour");
  expect(coreArguments).not.toContain("--external:@glowhop/observables");
  expect(reactArguments).toContain("--external:@glowhop/core-tour");
  expect(reactArguments).toContain("--external:react");
  expect(reactArguments).not.toContain("--external:vue");
});

test("rejects a framework import that is not declared by the measured adapter", () => {
  const react = bundleScenarios.find((scenario) => scenario.name === "React");
  expect(react).toBeDefined();

  expect(() =>
    assertBundleScenario(react!, {
      gzipBytes: 1,
      inputs: ["node_modules/vue/dist/vue.runtime.esm-bundler.js"],
      output: "export {};",
    }),
  ).toThrow("must not bundle another framework");
});

test("formats current gzip bytes, budget, and delta for every scenario", () => {
  const scenario = { ...bundleScenarios[0]!, gzipBudget: 1000, name: "Example" };

  expect(formatBundleMeasurement(scenario, 100)).toBe("Example: 100 B / 1000 B (-900 B)");
  expect(formatBundleMeasurement(scenario, 1200)).toBe("Example: 1200 B / 1000 B (+200 B)");
});

test("retains each targeted createGlowTour call while measuring tree-shaking", () => {
  for (const name of ["Core index", "React", "Vue", "Angular", "Solid", "Vanilla main"] as const) {
    const scenario = bundleScenarios.find((candidate) => candidate.name === name);
    expect(scenario?.entry).toStartWith("import { createGlowTour }");
    expect(scenario?.entry).toContain("createGlowTour();");
  }
});
