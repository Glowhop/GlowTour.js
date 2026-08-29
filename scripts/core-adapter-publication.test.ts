import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("core adapter publication", () => {
  test("publishes the adapter subpath with JavaScript and declaration targets", () => {
    const manifest = readJson(join(process.cwd(), "packages/core/package.json")) as {
      readonly exports?: Record<string, unknown>;
    };

    assert.deepEqual(manifest.exports?.["./adapter"], {
      import: "./dist/adapter.js",
      types: "./dist/adapter.d.ts",
    });
  });

  test("resolves the adapter subpath to its workspace source", () => {
    const tsconfig = readJson(join(process.cwd(), "tsconfig.json")) as {
      readonly compilerOptions?: { readonly paths?: Record<string, unknown> };
    };

    assert.deepEqual(tsconfig.compilerOptions?.paths?.["@glowhop/core-tour/adapter"], [
      "packages/core/src/adapter.ts",
    ]);
  });
});
