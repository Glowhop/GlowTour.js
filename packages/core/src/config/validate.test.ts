import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { ConfigValidationError } from "./types";
import { validateWorkflowConfig } from "./validate";

function minimalConfig() {
  return {
    version: "1.1",
    name: "onboarding",
    steps: [{ id: "s1", target: "#target", title: "Title", content: "Content" }],
  };
}

function issuesOf(config: unknown): readonly { path: string; message: string }[] {
  try {
    validateWorkflowConfig(config);
    throw new Error("expected validateWorkflowConfig to throw");
  } catch (error) {
    assert.ok(error instanceof ConfigValidationError);
    return error.issues;
  }
}

describe("validateWorkflowConfig", () => {
  test("accepts a minimal valid config", () => {
    const config = minimalConfig();
    assert.equal(validateWorkflowConfig(config), config);
  });

  test("accepts every builtin action shape and mixed inline functions", () => {
    const config = {
      version: "1.1",
      name: "onboarding",
      onStart: () => {},
      steps: [
        {
          id: "s2",
          target: "#target",
          title: "Title",
          content: "Content",
          data: { seatsRemaining: 3, active: true, note: null },
          actions: [
            { type: "wait", ms: 300 },
            { type: "waitUntilElement", selector: "#ready", interval: 10, timeout: 500 },
            { type: "clickTarget" },
            { type: "focusTarget" },
            () => true,
          ],
          targetEvents: [
            { event: "click", action: { type: "focusTarget" } },
            { event: ["keydown", "keyup"], action: () => {} },
          ],
          beforeEnter: () => {},
          beforeLeave: () => {},
        },
      ],
    };
    assert.equal(validateWorkflowConfig(config), config);
  });

  test("rejects a missing target", () => {
    const config = minimalConfig();
    // biome-ignore lint/suspicious/noExplicitAny: constructing an intentionally invalid config.
    delete (config.steps[0] as any).target;
    const issues = issuesOf(config);
    assert.ok(issues.some((issue) => issue.path === "steps[0].target"));
  });

  test("accepts a step without a title", () => {
    const { title: _title, ...step } = minimalConfig().steps[0];
    const config = { ...minimalConfig(), steps: [step] };
    assert.equal(validateWorkflowConfig(config), config);
  });

  test("requires the config format version", () => {
    const { version: _version, ...withoutVersion } = minimalConfig();
    for (const config of [withoutVersion, { ...minimalConfig(), version: "1.0" }]) {
      assert.deepEqual(
        issuesOf(config).map((issue) => [issue.path, issue.message]),
        [["version", 'version must be "1.1"']],
      );
    }
  });

  test("rejects an unknown top-level key", () => {
    const issues = issuesOf({ ...minimalConfig(), bogus: true });
    assert.ok(issues.some((issue) => issue.path === "bogus"));
  });

  test("rejects an unknown step key", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], bogus: true }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].bogus"));
  });

  test("rejects a wrong field type", () => {
    const issues = issuesOf({ ...minimalConfig(), name: 123 });
    assert.ok(issues.some((issue) => issue.path === "name"));
  });

  test("rejects a builtin action used as a step hook", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [
        {
          ...config.steps[0],
          beforeEnter: { type: "focusTarget" },
          beforeLeave: { type: "clickTarget" },
        },
      ],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].beforeEnter"));
    assert.ok(issues.some((issue) => issue.path === "steps[0].beforeLeave"));
  });

  test("rejects the removed transition hook and reset keys as unknown step keys", () => {
    const config = minimalConfig();
    const removedKeys = ["advanceAction", "previousAction", "cancelAction", "resetPropsOnEnter"];
    const issues = issuesOf({
      ...config,
      steps: [
        {
          ...config.steps[0],
          advanceAction: () => {},
          cancelAction: () => {},
          previousAction: () => {},
          resetPropsOnEnter: false,
        },
      ],
    });
    const paths = issues.map((issue) => issue.path);
    for (const key of removedKeys) assert.ok(paths.includes(`steps[0].${key}`));
  });

  test("rejects a builtin action used as a lifecycle hook", () => {
    const issues = issuesOf({ ...minimalConfig(), onFinish: { type: "wait", ms: 10 } });
    assert.ok(issues.some((issue) => issue.path === "onFinish"));
  });

  test("rejects a registry-id string action ref (no registry support)", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], actions: ["someRegistryId"] }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].actions[0]"));
  });

  test("rejects an unknown builtin action type", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], actions: [{ type: "waitUntil", predicate: "x" }] }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].actions[0].type"));
  });

  test("rejects unknown keys on a builtin action", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], actions: [{ type: "clickTarget", extra: true }] }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].actions[0].extra"));
  });

  test("rejects invalid and unknown nested option fields", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      overlay: {
        opacity: 2,
        opacit: 0.5,
        animation: { duration: -1, easing: 123, extra: true },
      },
      popover: {
        placementTryOrder: ["top", "diagonal"],
        arrow: { hidden: "no", size: -1 },
      },
      indicator: { hidden: "no", gap: -1 },
      behavior: {
        allowInteraction: "yes",
        allowScroll: "no",
        missingTarget: { strategy: "retry", timeout: -1 },
        scroll: { behavior: "instant" },
      },
      controls: { advance: { keys: ["Enter", 42], state: "gone" }, next: {} },
    });

    const paths = issues.map((issue) => issue.path);
    for (const path of [
      "overlay.opacity",
      "overlay.opacit",
      "overlay.animation.duration",
      "overlay.animation.easing",
      "overlay.animation.extra",
      "popover.placementTryOrder[1]",
      "popover.arrow.hidden",
      "popover.arrow.size",
      "indicator.hidden",
      "indicator.gap",
      "behavior.allowInteraction",
      "behavior.allowScroll",
      "behavior.missingTarget.strategy",
      "behavior.missingTarget.timeout",
      "behavior.scroll.behavior",
      "controls.advance.keys[1]",
      "controls.advance.state",
      "controls.next",
    ]) {
      assert.ok(paths.includes(path), `missing validation issue for ${path}`);
    }
  });

  test("accepts only enabled and disabled as a control state", () => {
    for (const state of ["enabled", "disabled"]) {
      const config = { ...minimalConfig(), controls: { cancel: { state } } };
      assert.equal(validateWorkflowConfig(config), config);
    }
    for (const state of ["visible", "hidden"]) {
      assert.deepEqual(issuesOf({ ...minimalConfig(), controls: { cancel: { state } } }), [
        { path: "controls.cancel.state", message: "must be one of: enabled, disabled" },
      ]);
    }
  });

  test("rejects allowScroll as a workflow key: it lives in behavior", () => {
    assert.deepEqual(issuesOf({ ...minimalConfig(), allowScroll: false }), [
      { path: "allowScroll", message: "Unknown key: allowScroll" },
    ]);
    const config = { ...minimalConfig(), behavior: { allowScroll: false } };
    assert.equal(validateWorkflowConfig(config), config);
  });

  test("validates nested options on individual steps", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [
        {
          ...config.steps[0],
          overlay: { color: 42 },
          controls: { advance: { state: "gone" }, cancel: "hidden" },
          indicator: { placementTryOrder: ["center"] },
          behavior: { overlayClick: "close" },
        },
      ],
    });

    const paths = issues.map((issue) => issue.path);
    assert.ok(paths.includes("steps[0].overlay.color"));
    assert.ok(paths.includes("steps[0].controls.advance.state"));
    assert.ok(paths.includes("steps[0].controls.cancel"));
    assert.ok(paths.includes("steps[0].indicator.placementTryOrder[0]"));
    assert.ok(paths.includes("steps[0].behavior.overlayClick"));
  });

  test("rejects invalid data values", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], data: { bad: { nested: true } } }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].data.bad"));
  });

  test("aggregates every issue in a single pass instead of failing fast", () => {
    const issues = issuesOf({
      bogus: true,
      steps: [
        { title: "Title", content: "Content" },
        {
          id: "s3",
          target: "#other",
          title: "Title",
          content: "Content",
          beforeLeave: { type: "wait", ms: 1 },
        },
      ],
    });

    const paths = issues.map((issue) => issue.path);
    assert.ok(paths.includes("bogus"));
    assert.ok(paths.includes("name"));
    assert.ok(paths.includes("steps[0].target"));
    assert.ok(paths.includes("steps[1].beforeLeave"));
    assert.ok(issues.length >= 4);
  });

  test("formats a readable message with one line per issue", () => {
    try {
      validateWorkflowConfig({ bogus: true, steps: [] });
      assert.fail("expected validateWorkflowConfig to throw");
    } catch (error) {
      assert.ok(error instanceof ConfigValidationError);
      assert.match(error.message, /bogus/);
      assert.match(error.message, /name/);
    }
  });
  test("reports a missing step id", () => {
    const issues = issuesOf({
      version: "1.1",
      name: "onboarding",
      steps: [{ target: "#target", title: "T", content: "C" }],
    });

    assert.ok(issues.some((issue) => issue.path === "steps[0].id"));
  });

  test("reports a duplicate step id, naming the step that already uses it", () => {
    const issues = issuesOf({
      version: "1.1",
      name: "onboarding",
      steps: [
        { id: "same", target: "#a", title: "T", content: "C" },
        { id: "same", target: "#b", title: "T", content: "C" },
      ],
    });

    const duplicate = issues.find((issue) => issue.path === "steps[1].id");
    assert.ok(duplicate);
    assert.match(duplicate.message, /already used by steps\[0\]/);
  });

  test("accepts classNames as strings or string arrays on the workflow and its steps", () => {
    const config = {
      ...minimalConfig(),
      classNames: { popover: "tour-popover", advance: ["primary", "large"] },
      steps: [{ ...minimalConfig().steps[0], classNames: { overlay: [], cancel: "ghost" } }],
    };
    assert.equal(validateWorkflowConfig(config), config);
  });

  test("rejects invalid classNames", () => {
    const config = {
      ...minimalConfig(),
      classNames: { popover: 1, arrow: "arrow" },
      steps: [{ ...minimalConfig().steps[0], classNames: { header: ["ok", 2] } }],
    };
    assert.deepEqual(
      issuesOf(config).map((issue) => [issue.path, issue.message]),
      [
        ["classNames.arrow", "Unknown key: arrow"],
        ["classNames.popover", "must be an array"],
        ["steps[0].classNames.header[1]", "must be a string"],
      ],
    );
  });
});
