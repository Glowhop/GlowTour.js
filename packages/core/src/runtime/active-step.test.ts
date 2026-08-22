import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Builder } from "../builder";
import { ActiveStep } from "./active-step";

function definition(options: {
  indicator?: { gap?: number };
  popover?: { disableArrow?: boolean; gap?: number };
}) {
  return new Builder<string>("active-step", {
    indicator: { gap: 22 },
    popover: { disableArrow: true, gap: 18 },
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
    assert.equal(step.popover?.disableArrow, true);
  });

  test("keeps step presentation overrides above workflow defaults", () => {
    const workflow = definition({
      indicator: { gap: 8 },
      popover: { disableArrow: false, gap: 6 },
    });
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.indicator?.gap, 8);
    assert.equal(step.popover?.gap, 6);
    assert.equal(step.popover?.disableArrow, false);
  });
});
