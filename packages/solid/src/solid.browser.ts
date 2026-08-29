import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  runAdapterAcceptance,
  runDefaultTourAcceptance,
} from "../../../scripts/adapter-acceptance";

let window: Window;
const ADAPTER_BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");

function trackStateSubscriptions<
  T extends { state: { get(): unknown; subscribe(listener: () => void): () => void } },
>(source: T) {
  let subscriptions = 0;
  let unsubscriptions = 0;
  const tracked = {
    ...source,
    state: {
      get: source.state.get,
      subscribe(listener: () => void) {
        subscriptions += 1;
        const unsubscribe = source.state.subscribe(listener);
        return () => {
          unsubscriptions += 1;
          unsubscribe();
        };
      },
    },
  };
  Object.defineProperty(tracked, ADAPTER_BRIDGE_SYMBOL, {
    value: Reflect.get(source, ADAPTER_BRIDGE_SYMBOL),
  });
  return {
    get subscriptions() {
      return subscriptions;
    },
    get unsubscriptions() {
      return unsubscriptions;
    },
    tour: tracked as T,
  };
}

beforeEach(() => {
  window = new Window();
  Object.assign(globalThis, {
    document: window.document,
    Event: window.Event,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    Node: window.Node,
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    ResizeObserver: window.ResizeObserver,
    SVGSVGElement: window.SVGSVGElement,
    window,
  });
});

afterEach(() => {
  window.close();
});

describe("solid adapter browser behavior", () => {
  test("passes the shared default-tour acceptance contract", async () => {
    const [{ createComponent }, { render }, { createGlowTour, DefaultTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const dispose = render(
      () => createComponent(DefaultTour, { idPrefix: "solid-default", tour }),
      container,
    );
    const root = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    assert.ok(root);

    await runDefaultTourAcceptance({
      content(value) {
        return value;
      },
      idPrefix: "solid-default",
      name: "solid default",
      root,
      target,
      tour,
      async settle() {
        await new Promise((resolve) => window.setTimeout(resolve, 10));
      },
      async unmount() {
        dispose();
        container.remove();
        target.remove();
      },
    });
  });

  test("exposes reactive tour state to descendants", async () => {
    const [{ createComponent }, { Dynamic, render }, { createGlowTour, GlowTour, useTour }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("reactive state")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    function Observer() {
      const state = useTour();
      return createComponent(Dynamic, {
        component: "output",
        get children() {
          return `${state().status}:${state().currentStepIndex}`;
        },
      });
    }
    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          tour,
          get children() {
            return [createComponent(GlowTour.Popover, {}), createComponent(Observer, {})];
          },
        }),
      container,
    );
    await tour.run(workflow);
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await tour.advance();
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    dispose();
  });

  test("keeps nested tour controls isolated from the outer root", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const outerTarget = document.createElement("button");
    const innerTarget = document.createElement("button");
    document.body.append(container, outerTarget, innerTarget);
    const outer = createGlowTour();
    const inner = createGlowTour();
    const workflow = (
      tour: typeof outer,
      target: HTMLElement,
      name: string,
      allowInteraction = false,
    ) =>
      tour
        .create(name)
        .step({
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "First",
          target,
          title: "First",
        })
        .step({
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "Second",
          target,
          title: "Second",
        })
        .build();
    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          idPrefix: "outer",
          tour: outer,
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.AdvanceTrigger, {}),
              createComponent(GlowTour.Root, {
                idPrefix: "inner",
                tour: inner,
                get children() {
                  return [
                    createComponent(GlowTour.Popover, {}),
                    createComponent(GlowTour.AdvanceTrigger, {}),
                  ];
                },
              }),
            ];
          },
        }),
      container,
    );
    await outer.run(workflow(outer, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner", true));
    const [outerAdvance, innerAdvance] = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-glow-tour-advance-trigger]"),
    );
    const outerDisabled = outerAdvance?.disabled;
    const outerAriaDisabled = outerAdvance?.getAttribute("aria-disabled");
    innerAdvance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(outer.state.get().currentStepIndex, 0);
    assert.equal(outerAdvance?.disabled, outerDisabled);
    assert.equal(outerAdvance?.getAttribute("aria-disabled"), outerAriaDisabled);
    dispose();
  });

  test("uses controller keyboard permission despite consumer-disabled advance trigger order", async () => {
    const [{ createComponent, createSignal }, { render }, { createGlowTour, GlowTour }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("keyboard order")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .step({ content: "Third", target, title: "Third" })
      .build();
    let setDisabledFirst!: (value: boolean) => void;
    const dispose = render(() => {
      const [disabledFirst, updateDisabledFirst] = createSignal(true);
      setDisabledFirst = updateDisabledFirst;
      let popover: ReturnType<typeof GlowTour.Popover> | undefined;
      return createComponent(GlowTour.Root, {
        tour,
        get children() {
          popover ??= createComponent(GlowTour.Popover, {});
          const disabled = createComponent(GlowTour.AdvanceTrigger, { disabled: true });
          const enabled = createComponent(GlowTour.AdvanceTrigger, {});
          return disabledFirst() ? [popover, disabled, enabled] : [popover, enabled, disabled];
        },
      });
    }, container);
    await tour.run(workflow);
    const disabled = container.querySelector<HTMLButtonElement>(
      "[data-glow-tour-consumer-disabled]",
    );
    disabled?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 1);
    await tour.previous();
    setDisabledFirst(false);
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 1);
    dispose();
  });

  test("delegates commands to controls that appear while a tour is active", async () => {
    const [{ createComponent, createSignal }, { render }, { createGlowTour, GlowTour }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("dynamic controls")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    let setShowAdvance!: (show: boolean) => void;
    const dispose = render(() => {
      const [showAdvance, updateShowAdvance] = createSignal(false);
      setShowAdvance = updateShowAdvance;
      let popover: ReturnType<typeof GlowTour.Popover> | undefined;
      return createComponent(GlowTour.Root, {
        tour,
        get children() {
          popover ??= createComponent(GlowTour.Popover, {});
          return [
            popover,
            createComponent(GlowTour.CancelTrigger, {}),
            createComponent(GlowTour.BackTrigger, {}),
            showAdvance() ? createComponent(GlowTour.AdvanceTrigger, {}) : null,
          ];
        },
      });
    }, container);

    await tour.run(workflow);
    const firstBack = container.querySelector<HTMLButtonElement>(
      "[data-glow-tour-previous-trigger]",
    );
    assert.equal(firstBack?.disabled, true);
    assert.equal(firstBack?.getAttribute("aria-disabled"), "true");
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(cancel?.disabled, false);
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().status, "cancelled");

    await tour.run(workflow);
    await tour.advance();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
    assert.equal(back?.disabled, false);
    assert.equal(back?.getAttribute("aria-keyshortcuts"), "ArrowLeft Backspace");
    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);

    setShowAdvance(true);
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, false);
    advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 1);

    dispose();
  });

  test("keeps native disabled, consumer marker, and aria-disabled coherent when disabled toggles", async () => {
    const [{ createComponent, createSignal }, { render }, { createGlowTour, GlowTour }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("toggle disabled")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    let setDisabled!: (disabled: boolean) => void;
    const dispose = render(() => {
      const [disabled, updateDisabled] = createSignal(true);
      setDisabled = updateDisabled;
      return createComponent(GlowTour.Root, {
        tour,
        get children() {
          return [
            createComponent(GlowTour.Popover, {}),
            createComponent(GlowTour.AdvanceTrigger, {
              get disabled() {
                return disabled();
              },
            }),
          ];
        },
      });
    }, container);

    await tour.run(workflow);
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, true);
    assert.equal(advance?.getAttribute("data-glow-tour-consumer-disabled"), "true");
    assert.equal(advance?.getAttribute("aria-disabled"), "true");

    setDisabled(false);
    await Promise.resolve();
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.hasAttribute("data-glow-tour-consumer-disabled"), false);
    assert.equal(advance?.getAttribute("aria-disabled"), "false");
    advance?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 1);

    dispose();
  });

  test("connects an injected instance and applies one coherent root ID family", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = createGlowTour();

    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          tour,
          get children() {
            return [
              createComponent(GlowTour.Popover, { children: "Popover" }),
              createComponent(GlowTour.Header, {}),
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.AdvanceTrigger, {}),
            ];
          },
        }),
      container,
    );

    await Promise.resolve();
    const root = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    const popover = container.querySelector<HTMLElement>("[data-glow-tour-popover]");
    const title = container.querySelector<HTMLElement>("[data-glow-tour-header]");
    const description = container.querySelector<HTMLElement>("[data-glow-tour-content]");
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");

    assert.equal(root?.id, "glow-tour-root");
    assert.equal(popover?.id, "glow-tour-popover");
    assert.equal(title?.id, "glow-tour-title");
    assert.equal(description?.id, "glow-tour-description");
    assert.equal(popover?.getAttribute("aria-labelledby"), title?.id);
    assert.equal(popover?.getAttribute("aria-describedby"), description?.id);
    assert.equal(advance?.getAttribute("aria-controls"), popover?.id);

    dispose();
    assert.equal(root?.id, "");
  });

  test("updates trigger state after a tour becomes active and reaches its final step", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("trigger updates")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();

    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          tour,
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.AdvanceTrigger, {
                finishLabel: "Complete",
                advanceLabel: "Continue",
              }),
            ];
          },
        }),
      container,
    );
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");

    assert.equal(advance?.disabled, true);
    await tour.run(workflow);
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.textContent, "Continue");
    advance?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(advance?.textContent, "Complete");

    dispose();
  });

  test("replaces the root tour subscription and commands when its reactive tour prop changes", async () => {
    const [{ createComponent, createSignal }, { render }, { createGlowTour, GlowTour }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const first = trackStateSubscriptions(createGlowTour());
    const second = trackStateSubscriptions(createGlowTour());
    const [tour, setTour] = createSignal(first.tour);
    const firstWorkflow = first.tour
      .create("first")
      .step({ content: "First tour", target, title: "First" })
      .build();
    const secondWorkflow = second.tour
      .create("second")
      .step({ content: "Second tour", target, title: "Second" })
      .build();

    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          get tour() {
            return tour();
          },
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.AdvanceTrigger, {}),
            ];
          },
        }),
      container,
    );

    await first.tour.run(firstWorkflow);
    assert.equal(container.textContent, "First tourFinish tour");
    assert.equal(first.subscriptions, 2);

    setTour(second.tour);
    await Promise.resolve();
    assert.equal(first.unsubscriptions, first.subscriptions);
    assert.equal(second.subscriptions, 2);

    await second.tour.run(secondWorkflow);
    assert.equal(container.textContent, "Second tourFinish tour");
    container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]")?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(second.tour.state.get().status, "finished");

    dispose();
    assert.equal(second.unsubscriptions, second.subscriptions);
  });

  test("does not execute consumer-disabled trigger commands", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("disabled commands")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          tour,
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.BackTrigger, { disabled: true }),
              createComponent(GlowTour.AdvanceTrigger, { disabled: true }),
              createComponent(GlowTour.CancelTrigger, { disabled: true }),
            ];
          },
        }),
      container,
    );

    await tour.run(workflow);
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(advance?.disabled, true);
    assert.equal(cancel?.disabled, true);
    advance?.click();
    cancel?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().status, "active");

    await tour.advance();
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
    assert.equal(back?.disabled, true);
    back?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 1);

    dispose();
  });

  test("passes the shared adapter acceptance contract with sibling roots", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const primaryTarget = document.createElement("button");
    const secondaryTarget = document.createElement("button");
    document.body.append(container, primaryTarget, secondaryTarget);
    const primaryTour = createGlowTour();
    const secondaryTour = createGlowTour();
    const dispose = render(
      () => [
        createComponent(GlowTour.Root, {
          idPrefix: "solid-primary",
          tour: primaryTour,
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.Header, {}),
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.AdvanceTrigger, {}),
            ];
          },
        }),
        createComponent(GlowTour.Root, {
          idPrefix: "solid-secondary",
          tour: secondaryTour,
          get children() {
            return [
              createComponent(GlowTour.Popover, {}),
              createComponent(GlowTour.Header, {}),
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.AdvanceTrigger, {}),
            ];
          },
        }),
      ],
      container,
    );
    const [primaryRoot, secondaryRoot] = Array.from(
      container.querySelectorAll<HTMLElement>("[data-glow-tour-root]"),
    );
    assert.ok(primaryRoot);
    assert.ok(secondaryRoot);

    await runAdapterAcceptance({
      content(value) {
        return value;
      },
      name: "solid",
      async mountDuplicatePrimary() {
        const duplicateContainer = document.createElement("div");
        document.body.append(duplicateContainer);
        let dispose: (() => void) | undefined;
        let mountError: unknown;
        try {
          dispose = render(
            () =>
              createComponent(GlowTour.Root, {
                idPrefix: "solid-duplicate",
                tour: primaryTour,
                get children() {
                  return [
                    createComponent(GlowTour.Popover, {}),
                    createComponent(GlowTour.Header, {}),
                    createComponent(GlowTour.Content, {}),
                    createComponent(GlowTour.AdvanceTrigger, {}),
                  ];
                },
              }),
            duplicateContainer,
          );
        } catch (error) {
          mountError = error;
        }
        let cleanupError: unknown;
        try {
          dispose?.();
        } catch (error) {
          cleanupError = error;
        }
        duplicateContainer.remove();
        if (mountError) throw mountError;
        if (cleanupError) throw cleanupError;
      },
      primaryRoot,
      primaryTarget,
      primaryTour,
      secondaryRoot,
      secondaryTarget,
      secondaryTour,
      async settle() {
        await new Promise((resolve) => window.setTimeout(resolve, 10));
      },
      async unmount() {
        dispose();
        container.remove();
        primaryTarget.remove();
        secondaryTarget.remove();
      },
    });
  });
});
