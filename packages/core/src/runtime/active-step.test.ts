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
    arrow?: { color?: string; hidden?: boolean; edgePadding?: number; size?: number };
    controls?: {
      advance?: "visible" | "hidden" | "disabled";
      cancel?: "visible" | "hidden" | "disabled";
    };
    gap?: number;
  };
}) {
  return new WorkflowBuilder<string>("active-step", {
    indicator: { gap: 22 },
    popover: {
      arrow: { color: "var(--workflow-arrow)", hidden: true, edgePadding: 18, size: 12 },
      controls: { advance: "disabled", cancel: "hidden" },
      gap: 18,
    },
  })
    .step({ id: "step-1", content: "content", target: "#target", title: "title", ...options })
    .build();
}

describe("ActiveStep presentation options", () => {
  test("inherits workflow presentation defaults", () => {
    const workflow = definition({});
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.props.get().indicator?.gap, 22);
    assert.equal(step.props.get().popover?.gap, 18);
    assert.deepEqual(step.props.get().popover?.arrow, {
      borderRadius: undefined,
      borderWidth: undefined,
      color: "var(--workflow-arrow)",
      autoStyles: undefined,
      hidden: true,
      edgePadding: 18,
      size: 12,
      styleNonce: undefined,
    });
  });

  test("keeps step presentation overrides above workflow defaults", () => {
    const workflow = definition({
      indicator: { gap: 8 },
      popover: { arrow: { color: "#4c35fd", hidden: false, size: 20 }, gap: 6 },
    });
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.props.get().indicator?.gap, 8);
    assert.equal(step.props.get().popover?.gap, 6);
    assert.deepEqual(step.props.get().popover?.arrow, {
      borderRadius: undefined,
      borderWidth: undefined,
      color: "#4c35fd",
      autoStyles: undefined,
      hidden: false,
      edgePadding: 18,
      size: 20,
      styleNonce: undefined,
    });
  });

  test("stores effective presentation props and restores nested mutations from initial props", () => {
    const workflow = definition({ popover: { gap: 6, controls: { cancel: "visible" } } });
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    assert.equal(step.props.get().popover?.controls?.advance, "disabled");
    assert.equal(step.props.get().popover?.controls?.cancel, "visible");
    assert.equal(step.snapshot().currentProps.popover?.gap, 6);

    step.props.set((props) => ({
      ...props,
      popover: { ...props.popover, controls: { advance: "visible", cancel: "hidden" } },
    }));
    assert.equal(step.snapshot().currentProps.popover?.controls?.advance, "visible");
    assert.equal(step.snapshot().currentProps.popover?.controls?.cancel, "hidden");

    step.props.set(step.initialProps);
    assert.equal(step.props.get().popover?.controls?.advance, "disabled");
    assert.equal(step.props.get().popover?.controls?.cancel, "visible");
  });

  test("restores from its immutable initial definition", () => {
    const workflow = definition({});
    const step = new ActiveStep(workflow.steps[0], workflow.options);

    step.props.set((props) => ({ ...props, data: { version: 2 } }));
    step.props.set(step.initialProps);

    assert.equal(Object.isFrozen(step.initialProps), true);
    assert.deepEqual(step.props.get().data, undefined);
    assert.deepEqual(workflow.steps[0]?.props.data, undefined);
  });
});

describe("ActiveStep scroll", () => {
  test("allows scrolling by default and reads behavior.allowScroll live", () => {
    const workflow = new WorkflowBuilder<string>("active-step", {
      behavior: { allowScroll: false },
    })
      .step({ id: "locked", content: "content", target: "#target", title: "title" })
      .step({
        id: "free",
        content: "content",
        target: "#target",
        title: "title",
        behavior: { allowScroll: true },
      })
      .build();
    const locked = new ActiveStep(workflow.steps[0], workflow.options);
    const free = new ActiveStep(workflow.steps[1], workflow.options);
    const unset = new ActiveStep(definition({}).steps[0], definition({}).options);

    assert.equal(locked.allowsScroll(), false);
    assert.equal(free.allowsScroll(), true);
    assert.equal(unset.allowsScroll(), true);

    locked.props.update({ behavior: { allowScroll: true } });
    assert.equal(locked.allowsScroll(), true);
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
      .step({ id: "step-2", content: "content", target: element, title: "title" })
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
      .step({ id: "step-3", content: "content", target: () => element, title: "title" })
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
      .step({ id: "step-4", content: "content", target: foreignElement, title: "title" })
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
      .step({ id: "step-5", content: "content", target: () => foreignElement, title: "title" })
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
