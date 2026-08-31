import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { WorkflowBuilder } from "../builder";
import { ActiveStep } from "./active-step";

function definition(options: {
  indicator?: { gap?: number };
  popover?: {
    arrow?: { color?: string; disabled?: boolean; edgePadding?: number; size?: number };
    hideFooter?: boolean;
    gap?: number;
  };
}) {
  return new WorkflowBuilder<string>("active-step", {
    indicator: { gap: 22 },
    popover: {
      arrow: { color: "var(--workflow-arrow)", disabled: true, edgePadding: 18, size: 12 },
      disableAdvanceButton: true,
      hideFooter: true,
      gap: 18,
    },
  })
    .step({
      content: "content",
      target: "#target",
      title: "title",
      ...options,
    })
    .build();
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

  test("stores effective presentation props and resets nested mutations", () => {
    const workflow = definition({ popover: { gap: 6, hideFooter: false } });
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.props.get().popover?.disableAdvanceButton, true);
    assert.equal(step.props.get().popover?.hideFooter, false);
    assert.equal(step.snapshot().currentProps.popover?.gap, 6);

    step.props.set((props) => ({
      ...props,
      popover: { ...props.popover, disableAdvanceButton: false, hideFooter: true },
    }));
    assert.equal(step.snapshot().currentProps.popover?.disableAdvanceButton, false);
    assert.equal(step.snapshot().currentProps.popover?.hideFooter, true);

    step.reset();
    assert.equal(step.props.get().popover?.disableAdvanceButton, true);
    assert.equal(step.props.get().popover?.hideFooter, false);
  });
});
