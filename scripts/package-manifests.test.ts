import { expect, test } from "bun:test";
import { buildPublishedManifest } from "./package-manifests";

test("rewrites every internal workspace dependency to its target package version", () => {
  const manifest = buildPublishedManifest(
    {
      dependencies: {
        "@glowhop/core-tour": "workspace:*",
      },
      exports: {
        ".": {
          import: "./dist/index.js",
        },
      },
      name: "@glowhop/react-tour",
      types: "./dist/index.d.ts",
      version: "0.2.0",
    },
    {
      "@glowhop/core-tour": "0.2.0",
      "@glowhop/react-tour": "0.2.0",
    },
  );

  expect(manifest.dependencies).toEqual({ "@glowhop/core-tour": "0.2.0" });
  expect(manifest.exports).toEqual({ ".": { import: "./index.js" } });
  expect(manifest.types).toBe("./index.d.ts");
});

test("rejects a workspace dependency whose target manifest is unavailable", () => {
  expect(() =>
    buildPublishedManifest(
      {
        dependencies: { "@glowhop/missing-tour": "workspace:*" },
        name: "@glowhop/react-tour",
        version: "0.2.0",
      },
      { "@glowhop/react-tour": "0.2.0" },
    ),
  ).toThrow("missing workspace version for @glowhop/missing-tour");
});

test("preserves publish metadata and package-specific side effects", () => {
  const source = {
    description: "A package",
    license: "MIT",
    homepage: "https://github.com/Glowhop/glow-tour#readme",
    bugs: { url: "https://github.com/Glowhop/glow-tour/issues" },
    keywords: ["glow-tour"],
    engines: { node: ">=18.19.1" },
    files: ["dist/**/*"],
    publishConfig: { access: "public" },
    sideEffects: ["*.css"],
    name: "@glowhop/styles-tour",
    version: "0.2.0",
  };

  expect(buildPublishedManifest(source, {})).toMatchObject({
    description: source.description,
    license: source.license,
    homepage: source.homepage,
    bugs: source.bugs,
    keywords: source.keywords,
    engines: source.engines,
    files: ["**/*"],
    publishConfig: source.publishConfig,
    sideEffects: source.sideEffects,
  });

  expect(
    buildPublishedManifest({ name: "@glowhop/core-tour", version: "0.2.0" }, {}).sideEffects,
  ).toBe(false);
  expect(
    buildPublishedManifest(
      { name: "@glowhop/vanilla-tour", sideEffects: true, version: "0.2.0" },
      {},
    ).sideEffects,
  ).toBe(true);
});
