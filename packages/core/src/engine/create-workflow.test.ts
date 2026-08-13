import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createWorkflow } from "./create-workflow";
import { WorkflowStep } from "./workflow-step";

describe("createWorkflow", () => {
  test("applies workflow presentation defaults to cloned steps", () => {
    const workflow = createWorkflow({
      name: "defaults",
      options: {
        indicator: { gap: 22 },
        popover: { disableArrow: true, gap: 18 },
      },
      steps: [
        new WorkflowStep({
          props: { content: "content", title: "title" },
          target: "#target",
        }),
      ],
    });

    assert.equal(workflow.steps[0].indicator?.gap, 22);
    assert.equal(workflow.steps[0].popover?.gap, 18);
    assert.equal(workflow.steps[0].popover?.disableArrow, true);
  });

  test("keeps step presentation overrides above workflow defaults", () => {
    const workflow = createWorkflow({
      name: "overrides",
      options: {
        indicator: { gap: 22 },
        popover: { disableArrow: true, gap: 18 },
      },
      steps: [
        new WorkflowStep({
          indicator: { gap: 8 },
          popover: { disableArrow: false, gap: 6 },
          props: { content: "content", title: "title" },
          target: "#target",
        }),
      ],
    });

    assert.equal(workflow.steps[0].indicator?.gap, 8);
    assert.equal(workflow.steps[0].popover?.gap, 6);
    assert.equal(workflow.steps[0].popover?.disableArrow, false);
  });
});
