import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { WorkflowBuilder } from "./index";

function workflow(name = "builder") {
  return new WorkflowBuilder<string>(name).step({
    content: "Content",
    target: "#target",
    title: "Title",
  });
}

describe("WorkflowBuilder public contract", () => {
  test("builds a frozen definition through the canonical fluent methods", () => {
    const callback = () => {};
    const definition = workflow()
      .delay(1)
      .do(() => true)
      .on(["click", "keydown"], callback)
      .beforeAdvance(() => {})
      .beforePrevious(() => {})
      .beforeCancel(() => {})
      .advance()
      .build();

    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.steps[0].actions), true);
    assert.deepEqual(
      definition.steps[0].eventHandlers.map(({ event }) => event),
      ["click", "keydown"],
    );
    assert.equal(definition.steps[0].eventHandlers[0].callback, callback);
  });

  test("does not retain former builder aliases", () => {
    const step = workflow();
    for (const alias of [
      "action",
      "alter",
      "back",
      "exec",
      "finish",
      "next",
      "onBack",
      "onCancel",
      "onEvent",
      "onNext",
      "wait",
    ]) {
      assert.equal(alias in step, false, alias);
    }
  });

  test("records the documented wait defaults in readonly instructions", () => {
    const definition = workflow()
      .waitFor(() => true)
      .waitForElement("#ready")
      .build();
    const [condition, element] = definition.steps[0].actions;

    assert.deepEqual(
      [condition, element].map((instruction) =>
        typeof instruction === "object"
          ? { interval: instruction.interval, timeout: instruction.timeout, type: instruction.type }
          : null,
      ),
      [
        { interval: 50, timeout: 3000, type: "waitFor" },
        { interval: 50, timeout: 3000, type: "waitFor" },
      ],
    );
    assert.equal(Object.isFrozen(condition), true);
    assert.equal(Object.isFrozen(element), true);
  });

  test("rejects invalid delay and wait timing options", () => {
    assert.throws(() => workflow().delay(-1), /delay/i);
    assert.throws(() => workflow().waitFor(() => true, { timeout: -1 }), /timeout/i);
    assert.throws(() => workflow().waitForElement("#ready", { interval: 0 }), /interval/i);
  });
});

describe("WorkflowStepBuilder.on", () => {
  test("infers the DOM event type from one event name", () => {
    workflow("single-event").on("click", (event) => {
      const clickEvent: MouseEvent = event;
      assert.equal(clickEvent.type, event.type);
    });
  });

  test("infers a union from multiple event names", () => {
    workflow("multiple-events").on(["click", "keydown"], (event) => {
      const domEvent: MouseEvent | KeyboardEvent = event;
      assert.equal(domEvent.type, event.type);
    });
  });

  test("rejects event names outside HTMLElementEventMap", () => {
    workflow("custom-event")
      // @ts-expect-error Custom event names are not part of HTMLElementEventMap.
      .on("tour:complete", (event: Event) => {
        assert.equal(event.type, "tour:complete");
      });
  });
});
