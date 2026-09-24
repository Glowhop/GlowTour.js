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
  test("hydrates server-rendered markup without throwing or duplicating content", async () => {
    // Solid's SSR (`renderToString`) and hydration (`hydrate`) resolve to different
    // builds of `solid-js/web` depending on the "browser" export condition, so the
    // server markup has to be produced out-of-process under the default (server)
    // conditions before it can be hydrated here under `--conditions=browser`.
    const script = `
      import { renderToString, generateHydrationScript } from "solid-js/web";
      import * as runtime from "./index.ts";
      const tour = runtime.createGlowTour();
      const html = renderToString(() =>
        runtime.GlowTourRoot({
          tour,
          get children() {
            return runtime.GlowTourPopover({ children: "Hello" });
          },
        }),
      );
      process.stdout.write(JSON.stringify({ html, hydrationScript: generateHydrationScript() }));
    `;
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", script],
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });
    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
    const { html, hydrationScript } = JSON.parse(new TextDecoder().decode(result.stdout)) as {
      html: string;
      hydrationScript: string;
    };

    // Replays the inline hydration-marker bootstrap that `<HydrationScript />`
    // renders on a real SSR page (it just seeds `globalThis._$HY`).
    const inlineScript = hydrationScript.replace(/^<script>|<\/script>.*$/gs, "");
    new Function(inlineScript)();

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    assert.ok(container.querySelector("[data-glow-tour-root]"));

    const [{ hydrate }, { createGlowTour, GlowTourPopover, GlowTourRoot }] = await Promise.all([
      import("solid-js/web"),
      import("./index"),
    ]);
    const tour = createGlowTour();
    assert.doesNotThrow(() => {
      // Calls the components as plain functions (matching how the SSR script above
      // called them) rather than through `createComponent`: the extra component
      // boundary `createComponent` introduces shifts Solid's hydration-key
      // numbering, which would desync client hydration from the server markup.
      hydrate(
        () =>
          GlowTourRoot({
            tour,
            get children() {
              return GlowTourPopover({ children: "Hello" });
            },
          }),
        container,
      );
    });

    // Hydration must attach to the existing server-rendered nodes rather than
    // re-creating them.
    assert.equal(container.querySelectorAll("[data-glow-tour-root]").length, 1);
    assert.equal(container.querySelectorAll("[data-glow-tour-popover]").length, 1);
    assert.equal(container.textContent, "Hello");

    container.remove();
  });

  test("passes the shared default-tour acceptance contract", async () => {
    const [{ createComponent }, { render }, { createGlowTour, GlowTourDefault }] =
      await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const dispose = render(
      () => createComponent(GlowTourDefault, { idPrefix: "solid-default", tour }),
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
    const [
      { createComponent },
      { Dynamic, render },
      { createGlowTour, GlowTourPopover, GlowTourRoot, useGlowTourContext },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("reactive state")
      .step({ id: "step-1", content: "First", target, title: "First" })
      .step({ id: "step-2", content: "Second", target, title: "Second" })
      .build();
    function Observer() {
      const state = useGlowTourContext();
      return createComponent(Dynamic, {
        component: "output",
        get children() {
          return `${state().status}:${state().currentStepIndex}`;
        },
      });
    }
    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          tour,
          get children() {
            return [createComponent(GlowTourPopover, {}), createComponent(Observer, {})];
          },
        }),
      container,
    );
    await tour.start(workflow);
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await tour.advance();
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    dispose();
  });

  test("useGlowTour exposes state accessors outside the root and disposes the tour it creates", async () => {
    const [
      { createComponent },
      { Dynamic, render },
      { GlowTourPopover, GlowTourRoot, useGlowTour },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    let glow!: ReturnType<typeof useGlowTour>;
    function App() {
      glow = useGlowTour();
      return [
        createComponent(Dynamic, {
          component: "output",
          get children() {
            return `${glow.status()}:${glow.currentStepIndex()}`;
          },
        }),
        createComponent(GlowTourRoot, {
          tour: glow.tour,
          get children() {
            return createComponent(GlowTourPopover, {});
          },
        }),
      ];
    }
    const dispose = render(() => createComponent(App, {}), container);
    const workflow = glow
      .create("use glow tour")
      .step({ id: "first", content: "First", target, title: "First" })
      .step({ id: "second", content: "Second", target, title: "Second" })
      .build();
    await glow.start(workflow);
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await glow.advance();
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    await glow.cancel();
    assert.equal(glow.status(), "cancelled");
    dispose();
    assert.equal(glow.tour.state.get().status, "disposed");
    container.remove();
    target.remove();
  });

  test("useGlowTour never disposes a tour it is given", async () => {
    const [{ createComponent }, { render }, { createGlowTour, useGlowTour }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = createGlowTour();
    let glow!: ReturnType<typeof useGlowTour>;
    function App() {
      glow = useGlowTour(tour);
      return glow.status();
    }
    const dispose = render(() => createComponent(App, {}), container);
    assert.equal(glow.tour, tour);
    dispose();
    assert.equal(tour.state.get().status, "idle");
    container.remove();
  });

  test("keeps nested tour controls isolated from the outer root", async () => {
    const [
      { createComponent },
      { render },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
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
          id: "step-3",
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "First",
          target,
          title: "First",
        })
        .step({
          id: "step-4",
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "Second",
          target,
          title: "Second",
        })
        .build();
    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          idPrefix: "outer",
          tour: outer,
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourAdvanceTrigger, {}),
              createComponent(GlowTourRoot, {
                idPrefix: "inner",
                tour: inner,
                get children() {
                  return [
                    createComponent(GlowTourPopover, {}),
                    createComponent(GlowTourAdvanceTrigger, {}),
                  ];
                },
              }),
            ];
          },
        }),
      container,
    );
    await outer.start(workflow(outer, outerTarget, "outer"));
    await inner.start(workflow(inner, innerTarget, "inner", true));
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
    const [
      { createComponent, createSignal },
      { render },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("keyboard order")
      .step({ id: "step-5", content: "First", target, title: "First" })
      .step({ id: "step-6", content: "Second", target, title: "Second" })
      .step({ id: "step-7", content: "Third", target, title: "Third" })
      .build();
    let setDisabledFirst!: (value: boolean) => void;
    const dispose = render(() => {
      const [disabledFirst, updateDisabledFirst] = createSignal(true);
      setDisabledFirst = updateDisabledFirst;
      let popover: ReturnType<typeof GlowTourPopover> | undefined;
      return createComponent(GlowTourRoot, {
        tour,
        get children() {
          popover ??= createComponent(GlowTourPopover, {});
          const disabled = createComponent(GlowTourAdvanceTrigger, { disabled: true });
          const enabled = createComponent(GlowTourAdvanceTrigger, {});
          return disabledFirst() ? [popover, disabled, enabled] : [popover, enabled, disabled];
        },
      });
    }, container);
    await tour.start(workflow);
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

  test("labels the cancel trigger with cancelLabel, and falls back to Skip", async () => {
    const [
      { createComponent, createSignal },
      { render },
      { createGlowTour, GlowTourCancelTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("cancel label")
      .step({ id: "step-cancel-label", content: "First", target, title: "First" })
      .build();
    let setCancelLabel!: (label: string | undefined) => void;
    const dispose = render(() => {
      const [cancelLabel, updateCancelLabel] = createSignal<string | undefined>(undefined);
      setCancelLabel = updateCancelLabel;
      return createComponent(GlowTourRoot, {
        tour,
        get children() {
          return [
            createComponent(GlowTourPopover, {}),
            createComponent(GlowTourCancelTrigger, {
              get cancelLabel() {
                return cancelLabel();
              },
            }),
          ];
        },
      });
    }, container);

    await tour.start(workflow);
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(cancel?.textContent, "Skip");
    assert.equal(cancel?.getAttribute("aria-label"), "Skip");

    setCancelLabel("Leave the tour");
    assert.equal(cancel?.textContent, "Leave the tour");
    assert.equal(cancel?.getAttribute("aria-label"), "Leave the tour");

    dispose();
  });

  test("delegates commands to controls that appear while a tour is active", async () => {
    const [
      { createComponent, createSignal },
      { render },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourCancelTrigger,
        GlowTourPopover,
        GlowTourPreviousTrigger,
        GlowTourRoot,
      },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("dynamic controls")
      .step({ id: "step-8", content: "First", target, title: "First" })
      .step({ id: "step-9", content: "Second", target, title: "Second" })
      .build();
    let setShowAdvance!: (show: boolean) => void;
    const dispose = render(() => {
      const [showAdvance, updateShowAdvance] = createSignal(false);
      setShowAdvance = updateShowAdvance;
      let popover: ReturnType<typeof GlowTourPopover> | undefined;
      return createComponent(GlowTourRoot, {
        tour,
        get children() {
          popover ??= createComponent(GlowTourPopover, {});
          return [
            popover,
            createComponent(GlowTourCancelTrigger, {}),
            createComponent(GlowTourPreviousTrigger, {}),
            showAdvance() ? createComponent(GlowTourAdvanceTrigger, {}) : null,
          ];
        },
      });
    }, container);

    await tour.start(workflow);
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

    await tour.start(workflow);
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
    const [
      { createComponent, createSignal },
      { render },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("toggle disabled")
      .step({ id: "step-10", content: "First", target, title: "First" })
      .step({ id: "step-11", content: "Second", target, title: "Second" })
      .build();
    let setDisabled!: (disabled: boolean) => void;
    const dispose = render(() => {
      const [disabled, updateDisabled] = createSignal(true);
      setDisabled = updateDisabled;
      return createComponent(GlowTourRoot, {
        tour,
        get children() {
          return [
            createComponent(GlowTourPopover, {}),
            createComponent(GlowTourAdvanceTrigger, {
              get disabled() {
                return disabled();
              },
            }),
          ];
        },
      });
    }, container);

    await tour.start(workflow);
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
    const [
      { createComponent },
      { render },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourContent,
        GlowTourHeader,
        GlowTourPopover,
        GlowTourRoot,
      },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = createGlowTour();

    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          tour,
          get children() {
            return [
              createComponent(GlowTourPopover, { children: "Popover" }),
              createComponent(GlowTourHeader, {}),
              createComponent(GlowTourContent, {}),
              createComponent(GlowTourAdvanceTrigger, {}),
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
    const [
      { createComponent },
      { render },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("trigger updates")
      .step({ id: "step-12", content: "First", target, title: "First" })
      .step({ id: "step-13", content: "Second", target, title: "Second" })
      .build();

    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          tour,
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourAdvanceTrigger, {
                finishLabel: "Complete",
                advanceLabel: "Continue",
              }),
            ];
          },
        }),
      container,
    );
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");

    // An idle tour does not disable its triggers: tour state only counts while the tour is active.
    assert.equal(advance?.disabled, false);
    await tour.start(workflow);
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.textContent, "Continue");
    advance?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(advance?.textContent, "Complete");

    dispose();
  });

  test("replaces the root tour subscription and commands when its reactive tour prop changes", async () => {
    const [
      { createComponent, createSignal },
      { render },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourContent, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const first = trackStateSubscriptions(createGlowTour());
    const second = trackStateSubscriptions(createGlowTour());
    const [tour, setTour] = createSignal(first.tour);
    const firstWorkflow = first.tour
      .create("first")
      .step({ id: "step-14", content: "First tour", target, title: "First" })
      .build();
    const secondWorkflow = second.tour
      .create("second")
      .step({ id: "step-15", content: "Second tour", target, title: "Second" })
      .build();

    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          get tour() {
            return tour();
          },
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourContent, {}),
              createComponent(GlowTourAdvanceTrigger, {}),
            ];
          },
        }),
      container,
    );

    await first.tour.start(firstWorkflow);
    assert.equal(container.textContent, "First tourFinish tour");
    // Popover (title-dependent dialog relations), content and trigger each subscribe.
    assert.equal(first.subscriptions, 3);

    setTour(second.tour);
    await Promise.resolve();
    assert.equal(first.unsubscriptions, first.subscriptions);
    assert.equal(second.subscriptions, 3);

    await second.tour.start(secondWorkflow);
    assert.equal(container.textContent, "Second tourFinish tour");
    container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]")?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(second.tour.state.get().status, "finished");

    dispose();
    assert.equal(second.unsubscriptions, second.subscriptions);
  });

  test("does not execute consumer-disabled trigger commands", async () => {
    const [
      { createComponent },
      { render },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourCancelTrigger,
        GlowTourPopover,
        GlowTourPreviousTrigger,
        GlowTourRoot,
      },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("disabled commands")
      .step({ id: "step-16", content: "First", target, title: "First" })
      .step({ id: "step-17", content: "Second", target, title: "Second" })
      .build();
    const dispose = render(
      () =>
        createComponent(GlowTourRoot, {
          tour,
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourPreviousTrigger, { disabled: true }),
              createComponent(GlowTourAdvanceTrigger, { disabled: true }),
              createComponent(GlowTourCancelTrigger, { disabled: true }),
            ];
          },
        }),
      container,
    );

    await tour.start(workflow);
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
    const [
      { createComponent },
      { render },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourContent,
        GlowTourHeader,
        GlowTourPopover,
        GlowTourRoot,
      },
    ] = await Promise.all([import("solid-js"), import("solid-js/web"), import("./index")]);
    const container = document.createElement("div");
    const primaryTarget = document.createElement("button");
    const secondaryTarget = document.createElement("button");
    document.body.append(container, primaryTarget, secondaryTarget);
    const primaryTour = createGlowTour();
    const secondaryTour = createGlowTour();
    const dispose = render(
      () => [
        createComponent(GlowTourRoot, {
          idPrefix: "solid-primary",
          tour: primaryTour,
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourHeader, {}),
              createComponent(GlowTourContent, {}),
              createComponent(GlowTourAdvanceTrigger, {}),
            ];
          },
        }),
        createComponent(GlowTourRoot, {
          idPrefix: "solid-secondary",
          tour: secondaryTour,
          get children() {
            return [
              createComponent(GlowTourPopover, {}),
              createComponent(GlowTourHeader, {}),
              createComponent(GlowTourContent, {}),
              createComponent(GlowTourAdvanceTrigger, {}),
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
              createComponent(GlowTourRoot, {
                idPrefix: "solid-duplicate",
                tour: primaryTour,
                get children() {
                  return [
                    createComponent(GlowTourPopover, {}),
                    createComponent(GlowTourHeader, {}),
                    createComponent(GlowTourContent, {}),
                    createComponent(GlowTourAdvanceTrigger, {}),
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
