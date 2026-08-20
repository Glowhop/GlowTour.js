import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { create } from "../builder";
import { createWorkflow } from "./create-workflow";

describe("createWorkflow", () => {
  test("applies workflow presentation defaults to cloned steps", () => {
    const workflow = createWorkflow(
      create<string>("defaults", {
        indicator: { gap: 22 },
        popover: { disableArrow: true, gap: 18 },
      })
        .step({ content: "content", target: "#target", title: "title" })
        .finish(),
    );

    assert.equal(workflow.steps[0].indicator?.gap, 22);
    assert.equal(workflow.steps[0].popover?.gap, 18);
    assert.equal(workflow.steps[0].popover?.disableArrow, true);
  });

  test("keeps step presentation overrides above workflow defaults", () => {
    const workflow = createWorkflow(
      create<string>("overrides", {
        indicator: { gap: 22 },
        popover: { disableArrow: true, gap: 18 },
      })
        .step({
          content: "content",
          indicator: { gap: 8 },
          popover: { disableArrow: false, gap: 6 },
          target: "#target",
          title: "title",
        })
        .finish(),
    );

    assert.equal(workflow.steps[0].indicator?.gap, 8);
    assert.equal(workflow.steps[0].popover?.gap, 6);
    assert.equal(workflow.steps[0].popover?.disableArrow, false);
  });
});
