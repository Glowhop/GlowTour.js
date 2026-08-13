import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const packageManifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

describe("solid adapter contract", () => {
  test("declares the SolidJS workspace package", () => {
    assert.equal(existsSync(new URL("../package.json", import.meta.url)), true);
    assert.equal(packageManifest.name, "@glowhop/solid-tour");
    assert.deepEqual(packageManifest.exports, { ".": "./src/index.ts" });
  });

  test("exports the shared core API and the Solid tour singleton", async () => {
    const entrypoint = new URL("./index.ts", import.meta.url);
    assert.equal(existsSync(entrypoint), true);

    const { createTourStore, glowTour } = await import(entrypoint.href);
    assert.equal(typeof createTourStore, "function");
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof glowTour.state.get, "function");
  });
});
