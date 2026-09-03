import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { WorkflowBuilder } from "../builder";
import { ActiveStep } from "./active-step";

function createRealmDocument() {
  let selected: HTMLElement | null = null;

  class RealmElement {
    isConnected = true;

    constructor(readonly ownerDocument: Document) {}
  }

  const document = {
    defaultView: { HTMLElement: RealmElement },
    querySelector: () => selected,
  } as unknown as Document;

  return {
    document,
    element: () => new RealmElement(document) as unknown as HTMLElement,
    HTMLElement: RealmElement,
    select(element: HTMLElement | null) {
      selected = element;
    },
  };
}

async function withGlobalHTMLElement<T>(
  HTMLElement: typeof globalThis.HTMLElement,
  callback: () => T,
) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: HTMLElement });
  try {
    return await callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "HTMLElement", descriptor);
    else Reflect.deleteProperty(globalThis, "HTMLElement");
  }
}

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
      disableAutoStyles: undefined,
      disabled: true,
      edgePadding: 18,
      size: 12,
      styleNonce: undefined,
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
      disableAutoStyles: undefined,
      disabled: false,
      edgePadding: 18,
      size: 20,
      styleNonce: undefined,
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

  test("resets from its immutable initial definition", () => {
    const workflow = definition({});
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    step.props.set((props) => ({ ...props, data: { version: 2 } }));
    step.reset();

    assert.equal(Object.isFrozen(step.initialProps), true);
    assert.deepEqual(step.props.get().data, undefined);
    assert.deepEqual(workflow.steps[0]?.props.data, undefined);
  });
});

describe("ActiveStep target resolution", () => {
  test("resolves selectors from its root document", async () => {
    const workflow = definition({});
    const realm = createRealmDocument();
    const element = realm.element();
    realm.select(element);
    const step = new ActiveStep(
      workflow.steps[0],
      workflow.options,
      undefined,
      "steps[2]",
      realm.document,
    );

    assert.equal(await step.resolveTarget(new AbortController().signal), element);
  });

  test("treats a detached direct target as missing", async () => {
    const realm = createRealmDocument();
    const element = realm.element();
    (element as unknown as { isConnected: boolean }).isConnected = false;
    const workflow = new WorkflowBuilder<string>("detached-direct")
      .step({ content: "content", target: element, title: "title" })
      .build();
    const step = new ActiveStep(
      workflow.steps[0],
      workflow.options,
      undefined,
      "steps[2]",
      realm.document,
    );

    await withGlobalHTMLElement(realm.HTMLElement as typeof globalThis.HTMLElement, async () => {
      assert.equal(await step.resolveTarget(new AbortController().signal), null);
    });
  });

  test("treats a detached resolver target as missing", async () => {
    const realm = createRealmDocument();
    const element = realm.element();
    (element as unknown as { isConnected: boolean }).isConnected = false;
    const workflow = new WorkflowBuilder<string>("detached-resolver")
      .step({ content: "content", target: () => element, title: "title" })
      .build();
    const step = new ActiveStep(
      workflow.steps[0],
      workflow.options,
      undefined,
      "steps[2]",
      realm.document,
    );

    assert.equal(await step.resolveTarget(new AbortController().signal), null);
  });

  test("rejects a direct target from another realm with its step path", async () => {
    const rootRealm = createRealmDocument();
    const foreignElement = createRealmDocument().element();
    const workflow = new WorkflowBuilder<string>("foreign-direct")
      .step({ content: "content", target: foreignElement, title: "title" })
      .build();
    const step = new ActiveStep(
      workflow.steps[0],
      workflow.options,
      undefined,
      "steps[2]",
      rootRealm.document,
    );

    await assert.rejects(() => step.resolveTarget(new AbortController().signal), {
      name: "TypeError",
      message: /steps\[2\]/,
    });
  });

  test("rejects a resolver target from another realm with its step path", async () => {
    const rootRealm = createRealmDocument();
    const foreignElement = createRealmDocument().element();
    const workflow = new WorkflowBuilder<string>("foreign-resolver")
      .step({ content: "content", target: () => foreignElement, title: "title" })
      .build();
    const step = new ActiveStep(
      workflow.steps[0],
      workflow.options,
      undefined,
      "steps[2]",
      rootRealm.document,
    );

    await assert.rejects(() => step.resolveTarget(new AbortController().signal), {
      name: "TypeError",
      message: /steps\[2\]/,
    });
  });
});
