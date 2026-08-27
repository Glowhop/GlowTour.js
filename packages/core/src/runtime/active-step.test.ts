import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Builder } from "../builder";
import { ActiveStep } from "./active-step";

function definition(options: {
  indicator?: { gap?: number };
  popover?: {
    arrow?: { color?: string; disabled?: boolean; edgePadding?: number; size?: number };
    gap?: number;
  };
}) {
  return new Builder<string>("active-step", {
    indicator: { gap: 22 },
    popover: {
      arrow: { color: "var(--workflow-arrow)", disabled: true, edgePadding: 18, size: 12 },
      gap: 18,
    },
  })
    .step({
      content: "content",
      target: "#target",
      title: "title",
      ...options,
    })
    .finish();
}

describe("ActiveStep presentation options", () => {
  test("inherits workflow presentation defaults", () => {
    const workflow = definition({});
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.indicator?.gap, 22);
    assert.equal(step.popover?.gap, 18);
    assert.deepEqual(step.popover?.arrow, {
      borderRadius: undefined,
      borderWidth: undefined,
      color: "var(--workflow-arrow)",
      disabled: true,
      edgePadding: 18,
      size: 12,
    });
  });

  test("keeps step presentation overrides above workflow defaults", () => {
    const workflow = definition({
      indicator: { gap: 8 },
      popover: { arrow: { color: "#4c35fd", disabled: false, size: 20 }, gap: 6 },
    });
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.indicator?.gap, 8);
    assert.equal(step.popover?.gap, 6);
    assert.deepEqual(step.popover?.arrow, {
      borderRadius: undefined,
      borderWidth: undefined,
      color: "#4c35fd",
      disabled: false,
      edgePadding: 18,
      size: 20,
    });
  });
});
