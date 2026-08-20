import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

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
    HTMLElement: window.HTMLElement,
    MouseEvent: window.MouseEvent,
    Node: window.Node,
    ResizeObserver: window.ResizeObserver,
    SVGSVGElement: window.SVGSVGElement,
    window,
  });
});

afterEach(() => {
  window.close();
});

describe("solid adapter browser behavior", () => {
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
      .finish();

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
      .finish();
    const secondWorkflow = second.tour
      .create("second")
      .step({ content: "Second tour", target, title: "Second" })
      .finish();

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
      .finish();
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
});
