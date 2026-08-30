import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import type { DynamicStepProps, StartOptions, Tour, TourState, WorkflowDefinition } from "./index";
import * as runtime from "./index";

const tour: Tour = runtime.createGlowTour();
const tourState: TourState | null = null;
const dynamicStepProps: DynamicStepProps | null = null;
const workflowDefinition: WorkflowDefinition | null = null;
const startOptions: StartOptions | null = null;
void [tour, tourState, dynamicStepProps, workflowDefinition, startOptions];

describe("vue adapter contract", () => {
  test("exports an instance factory and named native components without legacy runtime values", () => {
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
      "useTour",
    ]);
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.useTour, "function");
    assert.equal(typeof runtime.GlowTourDefault, "object");

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
      assert.equal(typeof component, "object");
    }

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
        "delete globalThis.document; delete globalThis.window; delete globalThis.HTMLElement; await import('./packages/vue/src/index.ts');",
      ],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
  });

  test("preserves pure presentation component initializers in the flattened entry", () => {
    const directory = mkdtempSync(join(tmpdir(), "glow-tour-vue-tree-shaking-"));

    try {
      const result = Bun.spawnSync({
        cmd: [
          "bun",
          "build",
          join(import.meta.dir, "index.ts"),
          "--format=esm",
          "--target=browser",
          "--external=vue",
          "--external=@glowhop/core-tour",
          "--external=@glowhop/core-tour/*",
          `--outdir=${directory}`,
        ],
        cwd: process.cwd(),
        stderr: "pipe",
      });

      assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
      const emittedSource = readFileSync(join(directory, "index.js"), "utf8");
      assert.equal(
        emittedSource.match(/\/\* @__PURE__ \*\/ defineComponent\d*\(/g)?.length,
        11,
        "every exported presentation component must be marked pure in the flattened entry",
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  test("renders a root boundary without client-generated IDs during SSR", async () => {
    const tour = runtime.createGlowTour();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(runtime.GlowTourRoot, { tour }, () =>
            h(runtime.GlowTourPopover, null, () => "Content"),
          ),
      }),
    );

    assert.match(html, /data-glow-tour-root/);
    assert.doesNotMatch(html, /id="glow-tour/);
    assert.doesNotMatch(html, /aria-labelledby/);
    assert.doesNotMatch(html, /aria-describedby/);
  });

  test("exposes label overrides without legacy previous props", () => {
    assert.equal("backLabel" in (runtime.GlowTourBackTrigger.props ?? {}), true);
    assert.equal("previousLabel" in (runtime.GlowTourBackTrigger.props ?? {}), false);
    assert.equal("advanceLabel" in (runtime.GlowTourAdvanceTrigger.props ?? {}), true);
    assert.equal("finishLabel" in (runtime.GlowTourAdvanceTrigger.props ?? {}), true);
    assert.equal("cancelLabel" in (runtime.GlowTourCancelTrigger.props ?? {}), false);
  });
});
