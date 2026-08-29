import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import * as runtime from "./index";

describe("react adapter contract", () => {
  test("exports an instance factory and component namespace without legacy runtime values", () => {
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.GlowTour, "object");
    assert.equal(typeof runtime.useTour, "function");
    assert.equal(typeof runtime.DefaultTour, "function");
    assert.equal(typeof runtime.GlowTour.Default, "function");
    assert.equal(runtime.GlowTour.Default, runtime.DefaultTour);

    for (const legacy of [
      "Builder",
      "create",
      "createTourStore",
      "TourStore",
      "WorkflowInstance",
      "WorkflowStep",
      "glowTour",
    ]) {
      assert.equal(legacy in runtime, false, `${legacy} must not be public`);
    }
  });

  test("imports without DOM globals for SSR", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "-e",
        "delete globalThis.document; delete globalThis.window; delete globalThis.HTMLElement; await import('./packages/react/src/index.ts');",
      ],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
  });

  test("exposes every instance-scoped component including cancellation", () => {
    for (const [namespaceComponent, namedComponent] of [
      [runtime.GlowTour.Root, runtime.Root],
      [runtime.GlowTour.Header, runtime.Header],
      [runtime.GlowTour.Content, runtime.Content],
      [runtime.GlowTour.Footer, runtime.Footer],
      [runtime.GlowTour.Popover, runtime.Popover],
      [runtime.GlowTour.Overlay, runtime.Overlay],
      [runtime.GlowTour.Pointer, runtime.Pointer],
      [runtime.GlowTour.BackTrigger, runtime.BackTrigger],
      [runtime.GlowTour.AdvanceTrigger, runtime.AdvanceTrigger],
      [runtime.GlowTour.CancelTrigger, runtime.CancelTrigger],
    ]) {
      assert.equal(typeof namespaceComponent, "function");
      assert.equal(namedComponent, namespaceComponent);
    }
  });
});
