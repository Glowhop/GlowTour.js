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
      "GlowTour",
      "GlowTourAdvanceTrigger",
      "GlowTourCancelTrigger",
      "GlowTourContent",
      "GlowTourDefault",
      "GlowTourFooter",
      "GlowTourHeader",
      "GlowTourOverlay",
      "GlowTourPointer",
      "GlowTourPopover",
      "GlowTourPreviousTrigger",
      "GlowTourRoot",
      "createGlowTour",
      "useGlowTour",
      "useTourContext",
    ]);
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.useGlowTour, "function");
    assert.equal(typeof runtime.useTourContext, "function");
    assert.equal(typeof runtime.GlowTourDefault, "function");

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

  test("exposes the composition components under the GlowTour namespace", () => {
    assert.deepEqual(Object.keys(runtime.GlowTour).sort(), [
      "AdvanceTrigger",
      "CancelTrigger",
      "Content",
      "Footer",
      "Header",
      "Overlay",
      "Pointer",
      "Popover",
      "PreviousTrigger",
      "Root",
    ]);
    assert.equal(runtime.GlowTour.AdvanceTrigger, runtime.GlowTourAdvanceTrigger);
    assert.equal(runtime.GlowTour.CancelTrigger, runtime.GlowTourCancelTrigger);
    assert.equal(runtime.GlowTour.Content, runtime.GlowTourContent);
    assert.equal(runtime.GlowTour.Footer, runtime.GlowTourFooter);
    assert.equal(runtime.GlowTour.Header, runtime.GlowTourHeader);
    assert.equal(runtime.GlowTour.Overlay, runtime.GlowTourOverlay);
    assert.equal(runtime.GlowTour.Pointer, runtime.GlowTourPointer);
    assert.equal(runtime.GlowTour.Popover, runtime.GlowTourPopover);
    assert.equal(runtime.GlowTour.PreviousTrigger, runtime.GlowTourPreviousTrigger);
    assert.equal(runtime.GlowTour.Root, runtime.GlowTourRoot);
    assert.equal("Default" in runtime.GlowTour, false);
  });

  test("renders the namespaced composition like the named components", async () => {
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");
    const render = (root: typeof runtime.GlowTourRoot, popover: typeof runtime.GlowTourPopover) =>
      renderToString(
        React.createElement(
          root,
          { idPrefix: "react-ns", tour: runtime.createGlowTour() },
          React.createElement(popover, null, "Content"),
        ),
      );

    const html = render(runtime.GlowTour.Root, runtime.GlowTour.Popover);
    assert.match(html, /data-glow-tour-root/);
    assert.match(html, /data-glow-tour-popover/);
    assert.equal(html, render(runtime.GlowTourRoot, runtime.GlowTourPopover));
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

  test("renders the packaged GlowTourDefault to a string without DOM globals", () => {
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
      "const html = renderToString(React.createElement(runtime.GlowTourDefault, { idPrefix: 'react-ssr', tour }));",
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

  test("renders the idle presentation into the GlowTourDefault markup before any binding runs", () => {
    // The bug this guards: GlowTourDefault renders overlay/pointer/popover
    // unconditionally, and the idle (out-of-flow, invisible) presentation used
    // to be applied only imperatively by each core element's initializeProps()
    // once an adapter binds it. That left server-rendered (and pre-hydration)
    // markup fully visible. Runs out-of-process like the SSR test above so it
    // genuinely exercises react-dom/server without any DOM globals.
    const script = [
      "delete globalThis.document;",
      "delete globalThis.window;",
      "delete globalThis.HTMLElement;",
      "const { renderToString } = await import('react-dom/server');",
      "const React = await import('react');",
      "const runtime = await import('./index.ts');",
      "const tour = runtime.createGlowTour();",
      "const html = renderToString(React.createElement(runtime.GlowTourDefault, { idPrefix: 'react-idle', tour }));",
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

    const popoverMatch = html.match(/<section[^>]*data-glow-tour-popover[^>]*>/);
    assert.ok(popoverMatch, "expected a rendered popover section");
    const popoverTag = popoverMatch[0];
    assert.match(popoverTag, /style="[^"]*position:fixed[^"]*"/);
    assert.match(popoverTag, /style="[^"]*opacity:0[^"]*"/);
    assert.match(popoverTag, /aria-hidden="true"/);
    assert.match(popoverTag, /inert=""/);

    const pointerMatch = html.match(/<div[^>]*data-glow-tour-pointer[^>]*>/);
    assert.ok(pointerMatch, "expected a rendered pointer div");
    const pointerTag = pointerMatch[0];
    assert.match(pointerTag, /style="[^"]*position:fixed[^"]*"/);
    assert.match(pointerTag, /style="[^"]*opacity:0[^"]*"/);
    assert.match(pointerTag, /aria-hidden="true"/);

    const overlayPathMatch = html.match(/<path[^>]*data-glow-tour-overlay-path[^>]*>/);
    assert.ok(overlayPathMatch, "expected a rendered overlay path");
    const overlayPathTag = overlayPathMatch[0];
    assert.match(overlayPathTag, /opacity="0"/);
    assert.match(overlayPathTag, /pointer-events="auto"/);
    assert.match(overlayPathTag, /cursor="auto"/);
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
    for (const component of [
      runtime.GlowTourRoot,
      runtime.GlowTourHeader,
      runtime.GlowTourContent,
      runtime.GlowTourFooter,
      runtime.GlowTourPopover,
      runtime.GlowTourOverlay,
      runtime.GlowTourPointer,
      runtime.GlowTourPreviousTrigger,
      runtime.GlowTourAdvanceTrigger,
      runtime.GlowTourCancelTrigger,
    ]) {
      assert.equal(typeof component, "function");
    }
    for (const removed of ["Root", "BackTrigger", "DefaultTour"]) {
      assert.equal(removed in runtime, false, `${removed} must not be exported`);
    }
  });
});
