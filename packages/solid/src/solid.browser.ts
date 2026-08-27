import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { runAdapterAcceptance } from "../../../scripts/adapter-acceptance";

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
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    window,
  });
});

afterEach(() => {
  window.close();
});

describe("solid adapter browser behavior", () => {
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
      .finish();
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
            return createComponent(Observer, {});
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
    const workflow = (tour: typeof outer, target: HTMLElement, name: string) =>
      tour
        .create(name)
        .step({ content: "First", target, title: "First" })
        .step({ content: "Second", target, title: "Second" })
        .build();
    const dispose = render(
      () =>
        createComponent(GlowTour.Root, {
          idPrefix: "outer",
          tour: outer,
          get children() {
            return [
              createComponent(GlowTour.NextTrigger, {}),
              createComponent(GlowTour.Root, {
                idPrefix: "inner",
                tour: inner,
                get children() {
                  return [
                    createComponent(GlowTour.Popover, {}),
                    createComponent(GlowTour.NextTrigger, {}),
                  ];
                },
              }),
            ];
          },
        }),
      container,
    );
    await outer.run(workflow(outer, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner"));
    const [outerNext, innerNext] = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-glow-tour-next-trigger]"),
    );
    const outerDisabled = outerNext?.disabled;
    const outerAriaDisabled = outerNext?.getAttribute("aria-disabled");
    innerNext?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(outer.state.get().currentStepIndex, 0);
    assert.equal(outerNext?.disabled, outerDisabled);
    assert.equal(outerNext?.getAttribute("aria-disabled"), outerAriaDisabled);
    dispose();
  });

  test("uses controller keyboard permission despite consumer-disabled next trigger order", async () => {
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
      return createComponent(GlowTour.Root, {
        tour,
        get children() {
          const disabled = createComponent(GlowTour.NextTrigger, { disabled: true });
          const enabled = createComponent(GlowTour.NextTrigger, {});
          return disabledFirst() ? [disabled, enabled] : [enabled, disabled];
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
    let setShowNext!: (show: boolean) => void;
    const dispose = render(() => {
      const [showNext, updateShowNext] = createSignal(false);
      setShowNext = updateShowNext;
      return createComponent(GlowTour.Root, {
        tour,
        get children() {
          return [
            createComponent(GlowTour.CancelTrigger, {}),
            createComponent(GlowTour.BackTrigger, {}),
            showNext() ? createComponent(GlowTour.NextTrigger, {}) : null,
          ];
        },
      });
    }, container);

    await tour.run(workflow);
    const firstBack = container.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
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
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    assert.equal(back?.disabled, false);
    assert.equal(back?.getAttribute("aria-keyshortcuts"), "ArrowLeft Backspace");
    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);

    setShowNext(true);
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    assert.equal(next?.disabled, false);
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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
          return createComponent(GlowTour.NextTrigger, {
            get disabled() {
              return disabled();
            },
          });
        },
      });
    }, container);

    await tour.run(workflow);
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    assert.equal(next?.disabled, true);
    assert.equal(next?.getAttribute("data-glow-tour-consumer-disabled"), "true");
    assert.equal(next?.getAttribute("aria-disabled"), "true");

    setDisabled(false);
    await Promise.resolve();
    assert.equal(next?.disabled, false);
    assert.equal(next?.hasAttribute("data-glow-tour-consumer-disabled"), false);
    assert.equal(next?.getAttribute("aria-disabled"), "false");
    next?.click();
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
              createComponent(GlowTour.NextTrigger, {}),
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
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");

    assert.equal(root?.id, "glow-tour-root");
    assert.equal(popover?.id, "glow-tour-popover");
    assert.equal(title?.id, "glow-tour-title");
    assert.equal(description?.id, "glow-tour-description");
    assert.equal(popover?.getAttribute("aria-labelledby"), title?.id);
    assert.equal(popover?.getAttribute("aria-describedby"), description?.id);
    assert.equal(next?.getAttribute("aria-controls"), popover?.id);

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
            return createComponent(GlowTour.NextTrigger, {
              finishLabel: "Complete",
              nextLabel: "Continue",
            });
          },
        }),
      container,
    );
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");

    assert.equal(next?.disabled, true);
    await tour.run(workflow);
    assert.equal(next?.disabled, false);
    assert.equal(next?.textContent, "Continue");
    next?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(next?.textContent, "Complete");

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
              createComponent(GlowTour.Content, {}),
              createComponent(GlowTour.NextTrigger, {}),
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
    container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]")?.click();
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
              createComponent(GlowTour.BackTrigger, { disabled: true }),
              createComponent(GlowTour.NextTrigger, { disabled: true }),
              createComponent(GlowTour.CancelTrigger, { disabled: true }),
            ];
          },
        }),
      container,
    );

    await tour.run(workflow);
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(next?.disabled, true);
    assert.equal(cancel?.disabled, true);
    next?.click();
    cancel?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().status, "active");

    await tour.advance();
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
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
              createComponent(GlowTour.NextTrigger, {}),
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
              createComponent(GlowTour.NextTrigger, {}),
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
                    createComponent(GlowTour.NextTrigger, {}),
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
