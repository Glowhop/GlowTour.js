import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { ConfigValidationError } from "./types";
import { validateWorkflowConfig } from "./validate";

function minimalConfig() {
  return {
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
          eventHandlers: [
            { event: "click", action: { type: "focusTarget" } },
            { event: ["keydown", "keyup"], action: () => {} },
          ],
          advanceAction: () => {},
          previousAction: () => {},
          cancelAction: () => {},
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

  test("rejects a config still carrying the removed schemaVersion field as an unknown key", () => {
    const issues = issuesOf({ ...minimalConfig(), schemaVersion: 1 });
    assert.ok(issues.some((issue) => issue.path === "schemaVersion"));
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

  test("rejects a builtin action used as a transition hook", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [{ ...config.steps[0], advanceAction: { type: "clickTarget" } }],
    });
    assert.ok(issues.some((issue) => issue.path === "steps[0].advanceAction"));
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
        arrow: { disabled: "no", size: -1 },
        keyboardShortcuts: { advance: ["Enter", 42] },
      },
      indicator: { disabled: "no", gap: -1 },
      behavior: {
        allowInteraction: "yes",
        missingTargetStrategy: "retry",
        scroll: { behavior: "instant" },
        targetTimeout: -1,
      },
    });

    const paths = issues.map((issue) => issue.path);
    for (const path of [
      "overlay.opacity",
      "overlay.opacit",
      "overlay.animation.duration",
      "overlay.animation.easing",
      "overlay.animation.extra",
      "popover.placementTryOrder[1]",
      "popover.arrow.disabled",
      "popover.arrow.size",
      "popover.keyboardShortcuts.advance[1]",
      "indicator.disabled",
      "indicator.gap",
      "behavior.allowInteraction",
      "behavior.missingTargetStrategy",
      "behavior.scroll.behavior",
      "behavior.targetTimeout",
    ]) {
      assert.ok(paths.includes(path), `missing validation issue for ${path}`);
    }
  });

  test("validates nested options on individual steps", () => {
    const config = minimalConfig();
    const issues = issuesOf({
      ...config,
      steps: [
        {
          ...config.steps[0],
          overlay: { color: 42 },
          popover: { hideFooter: "yes" },
          indicator: { placementTryOrder: ["center"] },
          behavior: { overlayClick: "close" },
        },
      ],
    });

    const paths = issues.map((issue) => issue.path);
    assert.ok(paths.includes("steps[0].overlay.color"));
    assert.ok(paths.includes("steps[0].popover.hideFooter"));
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
          advanceAction: { type: "wait", ms: 1 },
        },
      ],
    });

    const paths = issues.map((issue) => issue.path);
    assert.ok(paths.includes("bogus"));
    assert.ok(paths.includes("name"));
    assert.ok(paths.includes("steps[0].target"));
    assert.ok(paths.includes("steps[1].advanceAction"));
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
      name: "onboarding",
      steps: [{ target: "#target", title: "T", content: "C" }],
    });

    assert.ok(issues.some((issue) => issue.path === "steps[0].id"));
  });

  test("reports a duplicate step id, naming the step that already uses it", () => {
    const issues = issuesOf({
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
});
