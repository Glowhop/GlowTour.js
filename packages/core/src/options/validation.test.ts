import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { NoopTourViewDriver } from "../dom/tour-view-driver";
import { TourController } from "../runtime/tour-controller";
import type { StartOptions } from "../types";
import { validateWorkflowOptions } from "./validation";

const target = {} as HTMLElement;

function workflow(options: StartOptions<string> = {}) {
  return new TourController<string>(new NoopTourViewDriver())
    .create("validation", options)
    .step({ content: "content", target, title: "title" })
    .build();
}

describe("runtime option validation", () => {
  const invalidOptions: readonly { options: StartOptions<string>; path: string }[] = [
    { options: { behavior: { targetTimeout: -1 } }, path: "options.behavior.targetTimeout" },
    {
      options: { overlay: { animation: { duration: Number.POSITIVE_INFINITY, easing: "linear" } } },
      path: "options.overlay.animation.duration",
    },
    { options: { overlay: { opacity: Number.NaN } }, path: "options.overlay.opacity" },
    { options: { overlay: { padding: -1 } }, path: "options.overlay.padding" },
    { options: { overlay: { radius: -1 } }, path: "options.overlay.radius" },
    {
      options: { popover: { animation: { duration: -1, easing: "linear" } } },
      path: "options.popover.animation.duration",
    },
    { options: { popover: { gap: Number.NaN } }, path: "options.popover.gap" },
    { options: { popover: { arrow: { size: -1 } } }, path: "options.popover.arrow.size" },
    {
      options: { popover: { arrow: { borderWidth: Number.NEGATIVE_INFINITY } } },
      path: "options.popover.arrow.borderWidth",
    },
    {
      options: { popover: { arrow: { borderRadius: Number.NaN } } },
      path: "options.popover.arrow.borderRadius",
    },
    {
      options: { popover: { arrow: { edgePadding: -1 } } },
      path: "options.popover.arrow.edgePadding",
    },
    {
      options: { indicator: { animation: { duration: -1, easing: "linear" } } },
      path: "options.indicator.animation.duration",
    },
    { options: { indicator: { gap: -1 } }, path: "options.indicator.gap" },
  ];

  for (const { options, path } of invalidOptions) {
    test(`rejects ${path}`, () => {
      assert.throws(() => validateWorkflowOptions(workflow(options)), {
        message: `Invalid option: ${path}`,
        name: "TypeError",
      });
    });
  }

  test("requires an animation duration when animation options are present", () => {
    const options = {
      overlay: { animation: { easing: "linear" } },
    } as unknown as StartOptions<string>;

    assert.throws(() => validateWorkflowOptions(workflow(options)), {
      message: "Invalid option: options.overlay.animation.duration",
      name: "TypeError",
    });
  });

  test("accepts zero values and opacity endpoints", () => {
    assert.doesNotThrow(() =>
      validateWorkflowOptions(
        workflow({
          behavior: { targetTimeout: 0 },
          indicator: { animation: { duration: 0, easing: "linear" }, gap: 0 },
          overlay: {
            animation: { duration: 0, easing: "linear" },
            opacity: 0,
            padding: 0,
            radius: 0,
          },
          popover: {
            animation: { duration: 0, easing: "linear" },
            arrow: { borderRadius: 0, borderWidth: 0, edgePadding: 0, size: 0 },
            gap: 0,
          },
        }),
      ),
    );
    assert.doesNotThrow(() => validateWorkflowOptions(workflow({ overlay: { opacity: 1 } })));
  });

  test("identifies invalid props at their nonzero step index", () => {
    const definition = new TourController<string>(new NoopTourViewDriver())
      .create("validation")
      .step({ content: "first", target, title: "first" })
      .step({ content: "second", popover: { arrow: { size: -1 } }, target, title: "second" })
      .build();

    assert.throws(() => validateWorkflowOptions(definition), {
      message: "Invalid option: steps[1].popover.arrow.size",
      name: "TypeError",
    });
  });
});
