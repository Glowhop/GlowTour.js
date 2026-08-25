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
