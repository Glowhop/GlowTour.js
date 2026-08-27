import "@angular/compiler";
import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import * as runtime from "./public-api";

describe("angular adapter contract", () => {
  test("exports an instance factory and standalone native components without legacy runtime values", () => {
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.injectGlowTour, "function");

    for (const component of [
      runtime.GlowTourRoot,
      runtime.GlowTourHeader,
      runtime.GlowTourContent,
      runtime.GlowTourFooter,
      runtime.GlowTourPopover,
      runtime.GlowTourOverlay,
      runtime.GlowTourPointer,
      runtime.GlowTourBackTrigger,
      runtime.GlowTourNextTrigger,
      runtime.GlowTourCancelTrigger,
    ]) {
      assert.equal(typeof component, "function");
    }

    for (const legacy of [
      "Builder",
      "create",
      "createTourStore",
      "TourStore",
      "WorkflowInstance",
      "WorkflowStep",
      "glowTour",
      "GlowTourService",
    ]) {
      assert.equal(legacy in runtime, false, `${legacy} must not be public`);
    }
  });

  test("imports without DOM globals for SSR", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "-e",
        "delete globalThis.document; delete globalThis.window; delete globalThis.HTMLElement; await import('./packages/angular/node_modules/@angular/compiler/fesm2022/compiler.mjs'); await import('./packages/angular/src/public-api.ts');",
      ],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
  });

  test("keeps cancellation labels generic and does not expose the legacy cancelLabel input", () => {
    const definition = Reflect.get(runtime.GlowTourCancelTrigger, "ɵcmp");
    assert.equal(typeof definition, "object");
    assert.equal(Reflect.has(definition as object, "inputs"), true);
    const inputs = Reflect.get(definition as object, "inputs");
    assert.equal(typeof inputs, "object");
    assert.equal(Reflect.has(inputs as object, "cancelLabel"), false);
  });
});
