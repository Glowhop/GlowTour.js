import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { create } from "./index";

describe("StepBuilder.onEvent", () => {
  test("infers the DOM event type from one event name", () => {
    create("single-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onEvent("click", (event) => {
        const clickEvent: MouseEvent = event;
        assert.equal(clickEvent.type, event.type);
      });
  });

  test("infers a union from multiple event names", () => {
    create("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onEvent(["click", "keydown"], (event) => {
        const domEvent: MouseEvent | KeyboardEvent = event;
        assert.equal(domEvent.type, event.type);
      });
  });

  test("rejects event names outside HTMLElementEventMap", () => {
    create("custom-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      // @ts-expect-error Custom event names are not part of HTMLElementEventMap.
      .onEvent("tour:complete", (event: Event) => {
        assert.equal(event.type, "tour:complete");
      });
  });

  test("registers one handler for every event name", () => {
    const callback = () => {};
    const workflow = create("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onEvent(["click", "keydown"], callback)
      .finish();

    assert.deepEqual(
      workflow.steps[0].eventHandlers.map(({ event }) => event),
      ["click", "keydown"],
    );
    assert.equal(workflow.steps[0].eventHandlers[0].callback, callback);
    assert.equal(workflow.steps[0].eventHandlers[1].callback, callback);
  });
});
