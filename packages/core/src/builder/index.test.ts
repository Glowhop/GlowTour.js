import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { StepContext } from "../types";
import { create } from "./index";

function createContext(signal = new AbortController().signal): StepContext<string> {
  return {
    props: {} as StepContext<string>["props"],
    signal,
    target: {} as HTMLElement,
  };
}

describe("StepBuilder.onTargetEvent", () => {
  test("infers the DOM event type from one event name", () => {
    create("single-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent("click", (event) => {
        const clickEvent: MouseEvent = event;
        assert.equal(clickEvent.type, event.type);
      });
  });

  test("infers a union from multiple event names", () => {
    create("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], (event) => {
        const domEvent: MouseEvent | KeyboardEvent = event;
        assert.equal(domEvent.type, event.type);
      });
  });

  test("accepts a typed custom event", () => {
    create("custom-event")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent<CustomEvent<{ value: number }>>("tour:complete", (event) => {
        const value: number = event.detail.value;
        assert.equal(value, event.detail.value);
      });
  });

  test("registers one handler for every event name", () => {
    const callback = () => {};
    const workflow = create("multiple-events")
      .step({ content: "Content", target: "#target", title: "Title" })
      .onTargetEvent(["click", "keydown"], callback)
      .finish();

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
    const workflow = create<string>("wait-until")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(
        () => {
          attempts += 1;
          return attempts === 3;
        },
        { interval: 0, timeout: 100 },
      )
      .finish();

    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    assert.equal(await action(createContext()), true);
    assert.equal(attempts, 3);
  });

  test("waitUntil stops when its signal is aborted", async () => {
    const controller = new AbortController();
    const workflow = create<string>("cancel-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 10, timeout: 100 })
      .finish();
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
    const workflow = create<string>("cancel-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 0,
        timeout: 100,
      })
      .finish();
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
    const workflow = create<string>("timeout-pending-predicate")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)), {
        interval: 100,
        timeout: 5,
      })
      .finish();
    const action = workflow.steps[0].actions[0];
    assert.equal(typeof action, "function");
    if (typeof action !== "function") return;

    const startedAt = Date.now();
    await assert.rejects(async () => action(createContext()), /waitUntil timed out after 5ms/);
    assert.ok(Date.now() - startedAt < 30);
  });

  test("waitUntil throws after its timeout", async () => {
    const workflow = create<string>("timeout-wait")
      .step({ content: "Content", target: "#target", title: "Title" })
      .waitUntil(() => false, { interval: 0, timeout: 0 })
      .finish();
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
      const workflow = create<string>("wait-until-element")
        .step({ content: "Content", target: "#target", title: "Title" })
        .waitUntilElement("#ready", { interval: 0, timeout: 100 })
        .finish();
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
    const step = create<string>("validation").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });

    assert.throws(() => step.wait(-1), /finite non-negative number/);
    assert.throws(() => step.wait(Number.NaN), /finite non-negative number/);
    assert.throws(() => step.wait(Number.POSITIVE_INFINITY), /finite non-negative number/);
    assert.throws(() => step.waitUntil(() => true, { interval: -1 }), /finite non-negative number/);
    assert.throws(() => step.waitUntilElement(""), /selector must not be empty/);
    assert.throws(() => step.onTargetEvent([], () => {}), /events must not be empty/);
  });

  test("uses explicit advance and previous instructions", () => {
    const workflow = create<string>("navigation-actions")
      .step({ content: "Content", target: "#target", title: "Title" })
      .advance()
      .previous()
      .finish();

    assert.deepEqual(workflow.steps[0].actions, ["advance", "previous"]);
  });
});

describe("StepBuilder lifecycle", () => {
  test("rejects mutations through a stale step handle", () => {
    const first = create<string>("stale-step").step({
      content: "First",
      target: "#first",
      title: "First",
    });
    first.step({ content: "Second", target: "#second", title: "Second" });

    assert.throws(() => first.exec(() => {}), /StepBuilder is no longer active/);
  });

  test("rejects mutations after finish", () => {
    const step = create<string>("finished-step").step({
      content: "Content",
      target: "#target",
      title: "Title",
    });
    step.finish();

    assert.throws(() => step.onNext(() => {}), /StepBuilder is no longer active/);
  });
});

describe("StepBuilder.append", () => {
  test("appends an immutable workflow definition", () => {
    const reusable = create<string>("reusable")
      .step({ content: "Reusable", target: "#reusable", title: "Reusable" })
      .finish();
    const workflow = create<string>("composed")
      .step({ content: "First", target: "#first", title: "First" })
      .append(reusable)
      .finish();

    assert.deepEqual(
      workflow.steps.map((step) => step.props.title),
      ["First", "Reusable"],
    );
  });

  test("rejects an empty workflow definition", () => {
    const empty = create<string>("empty").finish();
    const step = create<string>("composed").step({
      content: "First",
      target: "#first",
      title: "First",
    });

    assert.throws(() => step.append(empty), /Cannot append a workflow without steps/);
  });
});
