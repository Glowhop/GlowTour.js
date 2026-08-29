import "@angular/compiler";
import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type {
  DynamicStepProps,
  StartOptions,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./public-api";
import * as runtime from "./public-api";

const tour: Tour = runtime.createGlowTour();
const tourState: TourState | null = null;
const dynamicStepProps: DynamicStepProps | null = null;
const workflowDefinition: WorkflowDefinition | null = null;
const startOptions: StartOptions | null = null;
void [tour, tourState, dynamicStepProps, workflowDefinition, startOptions];

describe("angular adapter contract", () => {
  test("exports an instance factory and standalone native components without legacy runtime values", () => {
    assert.deepEqual(Object.keys(runtime).sort(), [
      "GlowTourAdvanceTrigger",
      "GlowTourBackTrigger",
      "GlowTourCancelTrigger",
      "GlowTourContent",
      "GlowTourDefault",
      "GlowTourFooter",
      "GlowTourHeader",
      "GlowTourOverlay",
      "GlowTourPointer",
      "GlowTourPopover",
      "GlowTourRoot",
      "createGlowTour",
      "injectGlowTour",
    ]);
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.injectGlowTour, "function");
    assert.equal(typeof runtime.GlowTourDefault, "function");

    for (const component of [
      runtime.GlowTourDefault,
      runtime.GlowTourRoot,
      runtime.GlowTourHeader,
      runtime.GlowTourContent,
      runtime.GlowTourFooter,
      runtime.GlowTourPopover,
      runtime.GlowTourOverlay,
      runtime.GlowTourPointer,
      runtime.GlowTourBackTrigger,
      runtime.GlowTourAdvanceTrigger,
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
