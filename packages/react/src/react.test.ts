import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type {
  GlowTourOptions,
  StartOptions,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./index";
import * as runtime from "./index";

const tour: Tour = runtime.createGlowTour();
const tourState: TourState | null = null;
const stepPropsStore: StepPropsStore | null = null;
const workflowDefinition: WorkflowDefinition | null = null;
const startOptions: StartOptions | null = null;
const glowTourOptions: GlowTourOptions = {
  onSubscriberError: (error) => {
    const typedError: Error = error;
    void typedError;
  },
};
void [tour, tourState, stepPropsStore, workflowDefinition, startOptions, glowTourOptions];

describe("react adapter contract", () => {
  test("exports an instance factory and component namespace without legacy runtime values", () => {
    assert.deepEqual(Object.keys(runtime).sort(), [
      "AdvanceTrigger",
      "BackTrigger",
      "CancelTrigger",
      "Content",
      "DefaultTour",
      "Footer",
      "GlowTour",
      "Header",
      "Overlay",
      "Pointer",
      "Popover",
      "Root",
      "createGlowTour",
      "useTour",
    ]);
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

  test("renders the packaged DefaultTour to a string without DOM globals", () => {
    // Runs out-of-process (like the import test above) so this test proves
    // `react-dom/server`'s renderToString genuinely never touches `document`/
    // `window`, rather than merely running in the same jsdom-free bun:test
    // process where those globals happen to already be undefined.
    const script = [
      "delete globalThis.document;",
      "delete globalThis.window;",
      "delete globalThis.HTMLElement;",
      "const { renderToString } = await import('react-dom/server');",
      "const React = await import('react');",
      "const runtime = await import('./index.ts');",
      "const tour = runtime.createGlowTour();",
      "const html = renderToString(React.createElement(runtime.DefaultTour, { idPrefix: 'react-ssr', tour }));",
      "process.stdout.write(html);",
    ].join("\n");
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", script],
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });

    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
    const html = new TextDecoder().decode(result.stdout);
    assert.match(html, /data-glow-tour-root/);
    assert.match(html, /data-glow-tour-popover/);
    assert.doesNotMatch(html, /id="glow-tour/);
  });

  test("forwards subscriber error handlers to the core tour", () => {
    const errors: Error[] = [];
    const tour = runtime.createGlowTour({
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });

    tour.state.subscribe(() => {
      throw new Error("react subscriber failure");
    });

    assert.deepEqual(
      errors.map((error) => error.message),
      ["react subscriber failure"],
    );
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
