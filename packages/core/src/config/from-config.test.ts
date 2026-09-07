import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { WorkflowBuilder } from "../builder";
import { createGlowTour } from "../index";
import type { StepContext } from "../types";
import { createWorkflowFromConfig } from "./from-config";
import type { WorkflowConfig } from "./types";
import { ConfigValidationError } from "./types";

function element() {
  return new Window().document.createElement("button") as unknown as HTMLElement;
}

function context(target = element()): StepContext<string> {
  return {
    advance: async () => {},
    cancel: async () => {},
    previous: async () => {},
    props: {} as StepContext<string>["props"],
    signal: new AbortController().signal,
    target,
  };
}

describe("createWorkflowFromConfig", () => {
  test("produces a definition structurally equivalent to the same tour built by hand", () => {
    const onStart = () => {};
    const inlineAction = () => true;
    const clickHandler = () => {};
    const advanceAction = () => {};

    const config: WorkflowConfig = {
      name: "onboarding",
      cancellable: true,
      onStart,
      steps: [
        {
          target: "#invite-button",
          title: "Invite",
          content: "Invite your team",
          data: { seatsRemaining: 3 },
          actions: [{ type: "wait", ms: 300 }, inlineAction, { type: "clickTarget" }],
          eventHandlers: [{ event: "click", action: clickHandler }],
          advanceAction,
        },
      ],
    };

    const expected = new WorkflowBuilder<string>("onboarding", { cancellable: true, onStart })
      .step({
        target: "#invite-button",
        title: "Invite",
        content: "Invite your team",
        data: { seatsRemaining: 3 },
      })
      .wait(300)
      .do(inlineAction)
      .clickTarget()
      .onTargetEvent("click", clickHandler)
      .beforeAdvance(advanceAction)
      .build();

    const actual = createWorkflowFromConfig(config);

    assert.equal(actual.name, expected.name);
    assert.equal(actual.options.cancellable, expected.options.cancellable);
    assert.equal(actual.options.onStart, onStart);
    assert.deepEqual(actual.steps[0].props.title, expected.steps[0].props.title);
    assert.deepEqual(actual.steps[0].props.content, expected.steps[0].props.content);
    assert.deepEqual(actual.steps[0].props.data, expected.steps[0].props.data);
    assert.equal(actual.steps[0].actions.length, expected.steps[0].actions.length);
    assert.equal(actual.steps[0].actions[0], 300);
    assert.equal(actual.steps[0].actions[1], inlineAction);
    assert.equal(typeof actual.steps[0].actions[2], "function");
    assert.equal(
      actual.steps[0].eventHandlers.map((handler) => handler.event).join(","),
      expected.steps[0].eventHandlers.map((handler) => handler.event).join(","),
    );
    assert.equal(actual.steps[0].advanceAction, advanceAction);
  });

  test("maps the wait builtin to a plain delay instruction", () => {
    const definition = createWorkflowFromConfig({
      name: "wait",
      steps: [
        {
          target: "#target",
          title: "Title",
          content: "Content",
          actions: [{ type: "wait", ms: 250 }],
        },
      ],
    });

    assert.equal(definition.steps[0].actions[0], 250);
  });

  test("maps the clickTarget builtin to a click on the resolved target", () => {
    const definition = createWorkflowFromConfig({
      name: "click",
      steps: [
        {
          target: "#target",
          title: "Title",
          content: "Content",
          actions: [{ type: "clickTarget" }],
        },
      ],
    });

    const target = element();
    let clicked = false;
    target.addEventListener("click", () => {
      clicked = true;
    });
    const action = definition.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action === "function") action(context(target));
    assert.equal(clicked, true);
  });

  test("maps the focusTarget builtin to a focus on the resolved target", () => {
    const definition = createWorkflowFromConfig({
      name: "focus",
      steps: [
        {
          target: "#target",
          title: "Title",
          content: "Content",
          actions: [{ type: "focusTarget" }],
        },
      ],
    });

    const target = element();
    let focused = false;
    target.focus = () => {
      focused = true;
    };
    const action = definition.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action === "function") action(context(target));
    assert.equal(focused, true);
  });

  test("maps the waitUntilElement builtin to a poll for the selector", async () => {
    const definition = createWorkflowFromConfig({
      name: "wait-until-element",
      steps: [
        {
          target: "#target",
          title: "Title",
          content: "Content",
          actions: [{ type: "waitUntilElement", selector: "#ready", interval: 1, timeout: 50 }],
        },
      ],
    });

    const target = element();
    const document = target.ownerDocument;
    const ready = document.createElement("div");
    ready.id = "ready";
    document.body.appendChild(ready);

    const action = definition.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action === "function") assert.equal(await action(context(target)), true);
  });

  test("resolves a builtin action used inside an eventHandlers[].action slot", () => {
    const definition = createWorkflowFromConfig({
      name: "event-handler-builtin",
      steps: [
        {
          target: "#target",
          title: "Title",
          content: "Content",
          eventHandlers: [{ event: "click", action: { type: "focusTarget" } }],
        },
      ],
    });

    const target = element();
    let focused = false;
    target.focus = () => {
      focused = true;
    };
    const handler = definition.steps[0].eventHandlers[0];
    const EventConstructor = target.ownerDocument.defaultView?.Event as typeof Event;
    handler.callback(new EventConstructor("click"), context(target));
    assert.equal(focused, true);
  });

  test("attaches the original config as a frozen deep copy, leaving the caller's object untouched", () => {
    const config: WorkflowConfig = {
      name: "source-test",
      steps: [{ target: "#target", title: "Title", content: "Content" }],
    };

    const definition = createWorkflowFromConfig(config);

    assert.deepEqual(definition.source, config);
    assert.notEqual(definition.source, config);
    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.source), true);
    assert.equal(Object.isFrozen(definition.source.steps), true);
    assert.equal(Object.isFrozen(definition.source.steps[0]), true);
    assert.throws(() => {
      // biome-ignore lint/suspicious/noExplicitAny: verifying runtime immutability of a frozen object.
      (definition.source as any).name = "changed";
    });

    // The caller keeps ownership of the object they passed in: building a workflow from it must not
    // freeze it, so it stays reusable and editable to build a variant.
    assert.equal(Object.isFrozen(config), false);
    // biome-ignore lint/suspicious/noExplicitAny: `readonly` is a compile-time contract; this asserts the runtime object is not frozen.
    (config.steps[0] as any).title = "changed";
    assert.equal(config.steps[0].title, "changed");
    assert.equal(definition.source.steps[0].title, "Title");
  });

  test("preserves opaque and cyclic rich content in the frozen source", () => {
    class RichContent {
      constructor(readonly label: string) {}
    }

    const title = new RichContent("Title");
    const content: { self?: unknown } = {};
    content.self = content;
    const definition = createWorkflowFromConfig<RichContent | typeof content>(
      {
        name: "rich-source",
        steps: [{ target: "#target", title, content }],
      },
      { validateContent: () => null },
    );

    assert.equal(definition.source.steps[0].title, title);
    assert.equal(definition.source.steps[0].content, content);
    assert.equal(Object.getPrototypeOf(definition.source.steps[0].title), RichContent.prototype);
  });

  test("throws a ConfigValidationError for an invalid config instead of building", () => {
    assert.throws(
      () => createWorkflowFromConfig({ name: "bad", steps: "not-an-array" }),
      ConfigValidationError,
    );
  });

  // Regression coverage for the adapter-variance bug: `WorkflowDefinition<T>` is invariant in `T`
  // (step props use `T` covariantly, `StartOptions<T>.onStart` uses it contravariantly), so
  // `WorkflowDefinition<string>` was assignable neither to nor from `WorkflowDefinition<ReactNode>`
  // even though `string` is a valid `ReactNode`. Making `createWorkflowFromConfig` generic in `T`
  // (default `string`) fixes this: `createWorkflowFromConfig<T>(...)` now returns a
  // `WorkflowDefinition<T>` that a `GlowTour<T>` accepts directly, no cast required. These tests
  // only need to type-check to prove the fix (a regression would be a TS2345 build failure); they
  // also exercise the call at runtime, which rejects immediately since no root is connected.
  describe("generic content type (adapter variance regression)", () => {
    test("createWorkflowFromConfig()'s default T=string is accepted by a bare core GlowTour<string>", async () => {
      const tour = createGlowTour<string>();
      const workflow = createWorkflowFromConfig({
        name: "bare-core",
        steps: [{ target: "#a", title: "T", content: "C" }],
      });
      await assert.rejects(() => tour.run(workflow), /connected root/i);
    });

    test("createWorkflowFromConfig<T>() is accepted by GlowTour<T> for a non-string content type (structural stand-in for a framework adapter's ReactNode/VNode/JSX.Element)", async () => {
      type StandInContent = string | number | null;
      const tour = createGlowTour<StandInContent>();
      const workflow = createWorkflowFromConfig<StandInContent>(
        { name: "adapter-stand-in", steps: [{ target: "#a", title: "T", content: "C" }] },
        { validateContent: () => null },
      );
      await assert.rejects(() => tour.run(workflow), /connected root/i);
    });
  });
});
