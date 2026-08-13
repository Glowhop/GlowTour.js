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

  test("exports every public SolidJS component", async () => {
    const componentsModule = new URL("./components/tour-components.ts", import.meta.url);
    assert.equal(existsSync(componentsModule), true);

    const { GlowTour } = await import("./index");
    for (const component of [
      GlowTour.Root,
      GlowTour.Header,
      GlowTour.Content,
      GlowTour.Footer,
      GlowTour.Popover,
      GlowTour.Overlay,
      GlowTour.Pointer,
      GlowTour.BackTrigger,
      GlowTour.NextTrigger,
    ]) {
      assert.equal(typeof component, "function");
    }
  });

  test("preserves the accessible React adapter contract", () => {
    const componentsModule = new URL("./components/tour-components.ts", import.meta.url);
    assert.equal(existsSync(componentsModule), true);

    const source = readFileSync(componentsModule, "utf8");
    assert.match(source, /role:.*"dialog"/);
    assert.match(source, /"aria-hidden":\s*"true"/);
    assert.match(source, /role:\s*"presentation"/);
    assert.match(source, /data-glow-tour-pointer-content/);
    assert.match(source, /backLabel/);
    assert.match(source, /finishLabel/);
    assert.match(source, /glowTour\.state\.back\(\)/);
    assert.match(source, /glowTour\.state\.next\(\)/);
  });
});
