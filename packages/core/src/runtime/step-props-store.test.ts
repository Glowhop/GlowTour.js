import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { ReadonlyStepProps } from "../definition";
import { createStepPropsStore } from "./step-props-store";

const initialProps = {
  content: "content",
  data: { count: 1 },
  popover: { arrow: { color: "purple" } },
  title: "title",
};

describe("step props store", () => {
  test("immediately emits a stable frozen initial snapshot", () => {
    const store = createStepPropsStore(initialProps, () => {});
    const received: ReadonlyStepProps<string>[] = [];

    store.subscribe((props) => received.push(props));

    assert.equal(received.length, 1);
    assert.equal(received[0], store.get());
    assert.equal(Object.isFrozen(received[0]), true);
    assert.equal(Object.isFrozen(received[0]?.data), true);
    assert.equal(Object.isFrozen(received[0]?.popover?.arrow), true);
  });

  test("clones and publishes both value and updater sets", () => {
    const store = createStepPropsStore(initialProps, () => {});
    const contents: string[] = [];
    store.subscribe((props) => contents.push(props.content));
    store.set(store.get());
    const value = { ...initialProps, content: "value" };

    store.set(value);
    store.set((props) => ({ ...props, content: `${props.content}-updater` }));
    value.content = "mutated";

    assert.deepEqual(contents, ["content", "content", "value", "value-updater"]);
    assert.equal(store.get().content, "value-updater");
    assert.notEqual(store.get(), value);
  });

  test("preserves listener order and makes unsubscribe idempotent", () => {
    const store = createStepPropsStore(initialProps, () => {});
    const calls: string[] = [];
    const first = store.subscribe(() => calls.push("first"));
    const second = store.subscribe(() => calls.push("second"));
    calls.length = 0;

    first();
    first();
    store.set((props) => ({ ...props, content: "next" }));

    assert.deepEqual(calls, ["second"]);
    second();
  });

  test("uses a listener snapshot during reentrant subscriptions and unsubscriptions", () => {
    const store = createStepPropsStore(initialProps, () => {});
    const calls: string[] = [];
    let unsubscribeSecond = () => {};
    store.subscribe((props) => {
      if (props.content !== "next") return;
      calls.push("first");
      unsubscribeSecond();
      store.subscribe(() => calls.push("third"));
    });
    unsubscribeSecond = store.subscribe(() => calls.push("second"));
    calls.length = 0;

    store.set((props) => ({ ...props, content: "next" }));

    assert.deepEqual(calls, ["first", "third", "second"]);
  });

  test("reports one listener failure and continues to later listeners", () => {
    const failures: unknown[] = [];
    const store = createStepPropsStore(initialProps, (error) => failures.push(error));
    let laterCalls = 0;
    store.subscribe(() => {
      throw "store failure";
    });
    store.subscribe(() => {
      laterCalls += 1;
    });
    laterCalls = 0;

    store.set((props) => ({ ...props, content: "next" }));

    assert.deepEqual(failures, ["store failure", "store failure"]);
    assert.equal(laterCalls, 1);
  });
});
