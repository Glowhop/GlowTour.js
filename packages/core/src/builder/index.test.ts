import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { StepContext } from "../types";
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
      .wait(1)
      .do(() => true)
      .onTargetEvent(["click", "keydown"], callback)
      .beforeAdvance(() => {})
      .beforePrevious(() => {})
      .beforeCancel(() => {})
      .do(({ next }) => next())
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
      "goNext",
      "goPrevious",
      "next",
      "onBack",
      "onCancel",
      "onEvent",
      "onNext",
      "on",
    ]) {
      assert.equal(alias in step, false, alias);
    }
  });

  test("rejects invalid delay and wait timing options", () => {
    assert.throws(() => workflow().wait(-1), /timeMs/i);
    assert.throws(() => workflow().waitUntil(() => true, { timeout: -1 }), /timeout/i);
    assert.throws(() => workflow().waitUntilElement("#ready", { interval: 0 }), /interval/i);
  });
});

function createContext(signal = new AbortController().signal): StepContext<string> {
  return {
    cancel: async () => {},
    next: async () => {},
    previous: async () => {},
    props: {} as StepContext<string>["props"],
    signal,
    target: {} as HTMLElement,
  };
}

describe("StepBuilder.onTargetEvent", () => {
  test("infers the DOM event type from one event name", () => {
    new WorkflowBuilder<string>("single-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent("click", (event) => {
        const clickEvent: MouseEvent = event;
        assert.equal(clickEvent.type, event.type);
      });
  });

  test("infers a union from multiple event names", () => {
    new WorkflowBuilder<string>("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], (event) => {
        const domEvent: MouseEvent | KeyboardEvent = event;
        assert.equal(domEvent.type, event.type);
      });
  });

  test("accepts a typed custom event", () => {
    new WorkflowBuilder<string>("custom-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent<CustomEvent<{ value: number }>>("tour:complete", (event) => {
        const value: number = event.detail.value;
        assert.equal(value, event.detail.value);
      });
  });

  test("registers one handler for every event name", () => {
    const callback = () => {};
    const workflow = new WorkflowBuilder<string>("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], callback)
      .build();

    assert.deepEqual(
      workflow.steps[0].eventHandlers.map(({ event }) => event),
      ["click", "keydown"],
    );
    assert.equal(workflow.steps[0].eventHandlers[0].callback, callback);
    assert.equal(workflow.steps[0].eventHandlers[1].callback, callback);
  });
});

describe("StepBuilder action contract", () => {
  test("waitUntil retries until its predicate succeeds", async () => {
    let attempts = 0;
    const workflow = new WorkflowBuilder<string>("wait-until")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(
        () => {
          attempts += 1;
          return attempts === 3;
        },
        { interval: 1, timeout: 100 },
      )
      .build();

    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    assert.equal(await action(createContext()), true);
    assert.equal(attempts, 3);
  });

  test("waitUntil stops when its signal is aborted", async () => {
    const controller = new AbortController();
    const workflow = new WorkflowBuilder<string>("cancel-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 10, timeout: 100 })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    controller.abort();
    await assert.rejects(async () => action(createContext(controller.signal)), {
      name: "AbortError",
    });
  });

  test("waitUntil aborts while an async predicate is pending", async () => {
    const controller = new AbortController();
    const workflow = new WorkflowBuilder<string>("cancel-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 1,
        timeout: 100,
      })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    const startedAt = Date.now();
    const result = action(createContext(controller.signal));
    await Promise.resolve();
    controller.abort();

    await assert.rejects(async () => result, { name: "AbortError" });
    assert.ok(Date.now() - startedAt < 30);
  });

  test("waitUntil enforces its timeout while an async predicate is pending", async () => {
    const workflow = new WorkflowBuilder<string>("timeout-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 100,
        timeout: 5,
      })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    const startedAt = Date.now();
    await assert.rejects(async () => action(createContext()), /waitUntil timed out after 5ms/);
    assert.ok(Date.now() - startedAt < 30);
  });

  test("waitUntil throws after its timeout", async () => {
    const workflow = new WorkflowBuilder<string>("timeout-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 1, timeout: 0 })
      .build();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    await assert.rejects(async () => action(createContext()), /waitUntil timed out after 0ms/);
  });

  test("waitUntilElement polls the document until the selector resolves", async () => {
    const previousDocument = globalThis.document;
    let queries = 0;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        querySelector: () => {
          queries += 1;
          return queries === 2 ? {} : null;
        },
      },
    });

    try {
      const workflow = new WorkflowBuilder<string>("wait-until-element")
        .step({ content: "Content", target: "#target", title: "Title" })
        .waitUntilElement("#ready", { interval: 1, timeout: 100 })
        .build();
      const action = workflow.steps[0].actions[0];
      assert.equal(typeof action, "function");
      if (typeof action !== "function") return;

      assert.equal(await action(createContext()), true);
      assert.equal(queries, 2);
    } finally {
      if (previousDocument) {
        Object.defineProperty(globalThis, "document", {
          configurable: true,
          value: previousDocument,
        });
      } else {
        Reflect.deleteProperty(globalThis, "document");
      }
    }
  });

  test("validates timing values when defining the workflow", () => {
    const step = new WorkflowBuilder<string>("validation").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });

    assert.throws(() => step.wait(-1), /finite non-negative number/);
    assert.throws(() => step.wait(Number.NaN), /finite non-negative number/);
    assert.throws(() => step.wait(Number.POSITIVE_INFINITY), /finite non-negative number/);
    assert.throws(() => step.waitUntil(() => true, { interval: -1 }), /finite positive number/);
    assert.throws(() => step.waitUntilElement(""), /selector must not be empty/);
    assert.throws(() => step.onTargetEvent([], () => {}), /events must not be empty/);
  });

  test("exposes navigation through the action context", async () => {
    const calls: string[] = [];
    const step = new WorkflowBuilder<string>("navigation-actions").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });

    assert.equal("goNext" in step, false);
    assert.equal("goPrevious" in step, false);
    assert.equal("advance" in step, false);
    assert.equal("previous" in step, false);
    assert.equal("onBack" in step, false);

    const workflow = step
      .do(({ next }) => next())
      .do(({ previous }) => previous())
      .do(({ cancel }) => cancel())
      .build();

    const context = createContext();
    context.next = async () => {
      calls.push("next");
    };
    context.previous = async () => {
      calls.push("previous");
    };
    context.cancel = async () => {
      calls.push("cancel");
    };
    for (const action of workflow.steps[0].actions) {
      if (typeof action === "function") await action(context);
    }

    assert.deepEqual(calls, ["next", "previous", "cancel"]);
  });
});

describe("StepBuilder lifecycle", () => {
  test("rejects mutations through a stale step handle", () => {
    const first = new WorkflowBuilder<string>("stale-step").step({
      content: "First",
      target: "#first",
      title: "First",
    });
    first.step({ content: "Second", target: "#second", title: "Second" });

    assert.throws(() => first.do(() => {}), /StepBuilder is no longer active/);
  });

  test("rejects mutations after finish", () => {
    const step = new WorkflowBuilder<string>("finished-step").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });
    step.build();

    assert.throws(() => step.beforeAdvance(() => {}), /StepBuilder is no longer active/);
  });
});

describe("StepBuilder.append", () => {
  test("appends an immutable workflow definition", () => {
    const reusable = new WorkflowBuilder<string>("reusable")
      .step({ content: "Reusable", target: "#reusable", title: "Reusable" })
      .build();
    const workflow = new WorkflowBuilder<string>("composed")
      .step({ content: "First", target: "#first", title: "First" })
      .append(reusable)
      .build();

    assert.deepEqual(
      workflow.steps.map((step) => step.props.title),
      ["First", "Reusable"],
    );
  });

  test("rejects an empty workflow definition", () => {
    const empty = new WorkflowBuilder<string>("empty").build();
    const step = new WorkflowBuilder<string>("composed").step({
      content: "First",
      target: "#first",
      title: "First",
    });

    assert.throws(() => step.append(empty), /Cannot append a workflow without steps/);
  });
});
