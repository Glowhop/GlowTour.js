import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  runAdapterAcceptance,
  runDefaultTourAcceptance,
} from "../../../scripts/adapter-acceptance";

let window: Window;

beforeEach(() => {
  window = new Window();
  Object.assign(globalThis, {
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
    document: window.document,
    window,
  });
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  window.close();
});

async function waitForCondition(condition: () => boolean, description: string, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  }
}

describe("react adapter browser behavior", () => {
  test("hydrates server-rendered GlowTourDefault markup without console errors and stays interactive", async () => {
    // The SSR markup has to come from a real `react-dom/server` pass, produced
    // out-of-process (like the SSR string test in react.test.ts) so this exercises
    // an actual server-render -> client-hydrate handoff instead of only mounting
    // fresh markup into an empty container.
    const script = [
      "const { renderToString } = await import('react-dom/server');",
      "const React = await import('react');",
      "const runtime = await import('./index.ts');",
      "const tour = runtime.createGlowTour();",
      "const html = renderToString(React.createElement(runtime.GlowTourDefault, { idPrefix: 'react-hydrate', tour }));",
      "process.stdout.write(html);",
    ].join("\n");
    const result = Bun.spawnSync({
      cmd: ["bun", "-e", script],
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });
    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
    const html = new TextDecoder().decode(result.stdout);

    const [React, { hydrateRoot }, { createGlowTour, GlowTourDefault }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const tour = createGlowTour();

    const consoleErrors: unknown[][] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args);
    };
    let root: ReturnType<typeof hydrateRoot>;
    try {
      await React.act(async () => {
        root = hydrateRoot(
          container,
          React.createElement(GlowTourDefault, { idPrefix: "react-hydrate", tour }),
        );
      });
    } finally {
      console.error = originalConsoleError;
    }
    assert.deepEqual(consoleErrors, []);

    const target = document.createElement("button");
    document.body.append(target);
    const workflow = tour
      .create("hydrated")
      .step({ id: "step-1", content: "First", target, title: "First" })
      .build();
    await React.act(async () => {
      await tour.start(workflow);
    });
    assert.equal(container.querySelector("[data-glow-tour-content]")?.textContent, "First");
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, false);
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().status, "finished");

    await React.act(async () => root.unmount());
    container.remove();
    target.remove();
  });

  test("passes the shared default-tour acceptance contract", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTourDefault }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const root = createRoot(container);
    const actTour = {
      create: tour.create.bind(tour),
      async start(workflow: Parameters<typeof tour.start>[0]) {
        await React.act(() => tour.start(workflow));
      },
      state: tour.state,
    };

    await React.act(async () => {
      root.render(React.createElement(GlowTourDefault, { idPrefix: "react-default", tour }));
    });
    const tourRoot = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    assert.ok(tourRoot);

    await runDefaultTourAcceptance({
      content(value) {
        return value;
      },
      idPrefix: "react-default",
      name: "react default",
      root: tourRoot,
      target,
      tour: actTour,
      async settle() {
        await React.act(async () => {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        });
      },
      async unmount() {
        await React.act(async () => root.unmount());
        container.remove();
        target.remove();
      },
    });
  });

  test("exposes reactive tour state to descendants", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourPopover, GlowTourRoot, useGlowTourContext },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("reactive state")
      .step({ id: "step-2", content: "First", target, title: "First" })
      .step({ id: "step-3", content: "Second", target, title: "Second" })
      .build();
    function Observer() {
      const state = useGlowTourContext();
      return React.createElement("output", null, `${state.status}:${state.currentStepIndex}`);
    }
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(Observer),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await React.act(async () => tour.advance());
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    await React.act(async () => root.unmount());
  });

  test("useGlowTour exposes state outside the root and keeps its tour under StrictMode", async () => {
    const [React, { createRoot }, { GlowTourPopover, GlowTourRoot, useGlowTour }] =
      await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tours = new Set<ReturnType<typeof useGlowTour>["tour"]>();
    let glow!: ReturnType<typeof useGlowTour>;
    function App() {
      glow = useGlowTour();
      tours.add(glow.tour);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement("output", null, `${glow.status}:${glow.currentStepIndex}`),
        React.createElement(
          GlowTourRoot,
          { tour: glow.tour },
          React.createElement(GlowTourPopover),
        ),
      );
    }
    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
    });
    const workflow = glow
      .create("use glow tour")
      .step({ id: "first", content: "First", target, title: "First" })
      .step({ id: "second", content: "Second", target, title: "Second" })
      .build();
    await React.act(async () => {
      await glow.start(workflow);
    });
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await React.act(async () => glow.advance());
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    await React.act(async () => glow.hidePopover());
    assert.equal(glow.popoverHidden, true);
    await React.act(async () => glow.showPopover());
    assert.equal(glow.popoverHidden, false);
    await React.act(async () => glow.cancel());
    assert.equal(glow.status, "cancelled");
    assert.equal(new Set([...tours].filter((tour) => tour === glow.tour)).size, 1);
    await React.act(async () => root.unmount());
    container.remove();
    target.remove();
  });

  test("useGlowTour reads a tour it is given", async () => {
    const [React, { createRoot }, { createGlowTour, useGlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const tour = createGlowTour();
    let glow!: ReturnType<typeof useGlowTour>;
    function App() {
      glow = useGlowTour(tour);
      return React.createElement("output", null, glow.status);
    }
    const root = createRoot(container);
    await React.act(async () => root.render(React.createElement(App)));
    assert.equal(glow.tour, tour);
    assert.equal(container.querySelector("output")?.textContent, "idle");
    await React.act(async () => root.unmount());
    assert.equal(tour.state.get().status, "idle");
    container.remove();
  });

  test("adds step classNames after the component className, including a cloned child's", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("class names", { classNames: { popover: "tour" } })
      .step({
        id: "step-classes",
        content: "Content",
        target,
        classNames: { popover: ["step"], advance: "step-advance" },
      })
      .build();
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(
            GlowTourPopover,
            { className: "own" },
            React.createElement(
              GlowTourAdvanceTrigger,
              null,
              React.createElement("button", { className: "child" }),
            ),
          ),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const popover = container.querySelector("[data-glow-tour-popover]");
    const advance = container.querySelector("[data-glow-tour-advance-trigger]");
    assert.equal(popover?.className, "own step");
    assert.equal(advance?.className, "child step-advance");
    await React.act(async () => root.unmount());
  });

  test("keeps nested tour controls isolated from the outer root", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
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
          id: "step-4",
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "First",
          target,
          title: "First",
        })
        .step({
          id: "step-5",
          behavior: allowInteraction ? { allowInteraction: true } : undefined,
          content: "Second",
          target,
          title: "Second",
        })
        .build();
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { idPrefix: "outer", tour: outer },
          React.createElement(GlowTourPopover),
          React.createElement(GlowTourAdvanceTrigger),
          React.createElement(
            GlowTourRoot,
            { idPrefix: "inner", tour: inner },
            React.createElement(GlowTourPopover),
            React.createElement(GlowTourAdvanceTrigger),
          ),
        ),
      );
    });
    await React.act(async () => {
      await outer.start(workflow(outer, outerTarget, "outer"));
      await inner.start(workflow(inner, innerTarget, "inner", true));
    });
    const [outerAdvance, innerAdvance] = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-glow-tour-advance-trigger]"),
    );
    const outerDisabled = outerAdvance?.disabled;
    const outerAriaDisabled = outerAdvance?.getAttribute("aria-disabled");
    await React.act(async () => {
      innerAdvance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(outer.state.get().currentStepIndex, 0);
    assert.equal(outerAdvance?.disabled, outerDisabled);
    assert.equal(outerAdvance?.getAttribute("aria-disabled"), outerAriaDisabled);
    await React.act(async () => root.unmount());
  });

  test("uses controller keyboard permission despite consumer-disabled advance trigger order", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("keyboard order")
      .step({ id: "step-6", content: "First", target, title: "First" })
      .step({ id: "step-7", content: "Second", target, title: "Second" })
      .step({ id: "step-8", content: "Third", target, title: "Third" })
      .build();
    let setDisabledFirst!: (value: boolean) => void;
    function Harness() {
      const [disabledFirst, updateDisabledFirst] = React.useState(true);
      setDisabledFirst = updateDisabledFirst;
      const disabled = React.createElement(GlowTourAdvanceTrigger, { disabled: true });
      const enabled = React.createElement(GlowTourAdvanceTrigger);
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover),
        disabledFirst ? disabled : enabled,
        disabledFirst ? enabled : disabled,
      );
    }
    const root = createRoot(container);
    await React.act(async () => root.render(React.createElement(Harness)));
    await React.act(async () => {
      await tour.start(workflow);
    });
    const disabled = container.querySelector<HTMLButtonElement>(
      "[data-glow-tour-consumer-disabled]",
    );
    await React.act(async () => {
      disabled?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStepIndex, 0);
    await React.act(async () => {
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStepIndex, 1);
    await React.act(async () => {
      await tour.previous();
      setDisabledFirst(false);
    });
    await React.act(async () => {
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStepIndex, 1);
    await React.act(async () => root.unmount());
  });

  test("synchronizes custom keyboard shortcuts on a late advance trigger", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("custom shortcuts")
      .step({
        id: "step-9",
        content: "First",
        controls: { advance: { keys: ["N"] } },
        target,
        title: "First",
      })
      .step({ id: "step-10", content: "Second", target, title: "Second" })
      .build();
    let show!: () => void;
    function Harness() {
      const [visible, setVisible] = React.useState(false);
      show = () => setVisible(true);
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover),
        visible ? React.createElement(GlowTourAdvanceTrigger) : null,
      );
    }
    const root = createRoot(container);
    await React.act(async () => root.render(React.createElement(Harness)));
    await React.act(async () => {
      await tour.start(workflow);
      show();
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.getAttribute("aria-keyshortcuts"), "N");
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await waitForCondition(
        () => tour.state.get().currentStepIndex === 1 && tour.state.get().status === "active",
        "the late Advance trigger command to finish",
      );
    });
    await React.act(async () => root.unmount());
  });

  test("delegates cancel, back, and advance commands while a tour is active", async () => {
    const [
      React,
      { createRoot },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourCancelTrigger,
        GlowTourPopover,
        GlowTourPreviousTrigger,
        GlowTourRoot,
      },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("dynamic controls")
      .step({ id: "step-11", content: "First", target, title: "First" })
      .step({ id: "step-12", content: "Second", target, title: "Second" })
      .build();
    function Harness() {
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover),
        React.createElement(GlowTourCancelTrigger),
        React.createElement(GlowTourPreviousTrigger),
        React.createElement(GlowTourAdvanceTrigger),
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const firstBack = container.querySelector<HTMLButtonElement>(
      "[data-glow-tour-previous-trigger]",
    );
    assert.equal(firstBack?.disabled, true);
    assert.equal(firstBack?.getAttribute("aria-disabled"), "true");
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(cancel?.disabled, false);
    await React.act(async () => {
      cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await waitForCondition(
        () => tour.state.get().status === "cancelled",
        "the delegated Cancel command to finish",
      );
    });

    await React.act(async () => {
      await tour.start(workflow);
      await tour.advance();
    });

    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
    assert.equal(back?.disabled, false);
    assert.equal(back?.getAttribute("aria-keyshortcuts"), "ArrowLeft Backspace");
    await React.act(async () => {
      back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await waitForCondition(
        () => tour.state.get().currentStepIndex === 0 && tour.state.get().status === "active",
        "the delegated Back navigation to finish",
      );
    });

    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.getAttribute("aria-keyshortcuts"), "Enter ArrowRight");

    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await waitForCondition(
        () => tour.state.get().currentStepIndex === 1 && tour.state.get().status === "active",
        "the delegated Advance navigation to finish",
      );
    });

    await React.act(async () => root.unmount());
  });

  test("keeps previous disabled on the first step while the next target resolves", async () => {
    const [
      React,
      { createRoot },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourPopover,
        GlowTourPreviousTrigger,
        GlowTourRoot,
      },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    let resolveTarget!: (value: HTMLElement | null) => void;
    const pending = new Promise<HTMLElement | null>((resolve) => {
      resolveTarget = resolve;
    });
    const workflow = tour
      .create("pending target", { animated: false })
      .step({ id: "step-pending-1", content: "One", target, title: "One" })
      .step({ id: "step-pending-2", content: "Two", target: () => pending, title: "Two" })
      .build();
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover, null),
          React.createElement(GlowTourPreviousTrigger, null),
          React.createElement(GlowTourAdvanceTrigger, null),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const previous = container.querySelector<HTMLButtonElement>(
      "[data-glow-tour-previous-trigger]",
    );
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(previous?.disabled, true);

    let advancing!: Promise<void>;
    await React.act(async () => {
      advancing = tour.advance();
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().awaitingTarget, true);
    assert.equal(previous?.disabled, true);
    assert.equal(advance?.disabled, true);

    await React.act(async () => {
      resolveTarget(target);
      await advancing;
    });
    assert.equal(previous?.disabled, false);
    assert.equal(advance?.disabled, false);

    await React.act(async () => root.unmount());
  });

  test("labels the cancel trigger with cancelLabel, and falls back to Skip", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourCancelTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("cancel label")
      .step({ id: "step-cancel-label", content: "First", target, title: "First" })
      .build();
    const root = createRoot(container);
    let setCancelLabel!: (label: string | undefined) => void;
    const Harness = () => {
      const [cancelLabel, updateCancelLabel] = React.useState<string | undefined>(undefined);
      setCancelLabel = updateCancelLabel;
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover, null),
        React.createElement(GlowTourCancelTrigger, { cancelLabel }),
      );
    };

    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const cancel = container.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    assert.equal(cancel?.textContent, "Skip");
    assert.equal(cancel?.getAttribute("aria-label"), "Skip");

    await React.act(async () => {
      setCancelLabel("Leave the tour");
    });
    assert.equal(cancel?.textContent, "Leave the tour");
    assert.equal(cancel?.getAttribute("aria-label"), "Leave the tour");

    await React.act(async () => root.unmount());
  });

  test("composes custom child and wrapper click handlers before navigation", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("composed handlers")
      .step({ id: "step-13", content: "First", target, title: "First" })
      .step({ id: "step-14", content: "Second", target, title: "Second" })
      .build();
    let childClicks = 0;
    let wrapperClicks = 0;
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(
            GlowTourAdvanceTrigger,
            { onClick: () => (wrapperClicks += 1) },
            React.createElement("button", { onClick: () => (childClicks += 1) }),
          ),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    assert.equal(childClicks, 1);
    assert.equal(wrapperClicks, 1);
    assert.equal(tour.state.get().currentStepIndex, 1);

    await React.act(async () => root.unmount());
  });

  test("lets a consumer prevent a delegated advance click without navigation", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("prevented")
      .step({ id: "step-15", content: "First", target, title: "First" })
      .step({ id: "step-16", content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(GlowTourAdvanceTrigger, {
            onClick: (event) => event.preventDefault(),
          }),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    // From the keyboard too: Enter is left to the browser, whose click the consumer prevents.
    const enter = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" });
    advance?.dispatchEvent(enter);
    assert.equal(enter.defaultPrevented, false);
    advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    await React.act(async () => root.unmount());
  });

  test("advances exactly once when a consumer does not prevent a delegated advance click", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    let advances = 0;
    const workflow = tour
      .create("nonpreventing")
      .step({ id: "step-17", content: "First", target, title: "First" })
      .beforeLeave(() => {
        advances += 1;
      })
      .step({ id: "step-18", content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(GlowTourAdvanceTrigger),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(advances, 1);

    await React.act(async () => root.unmount());
  });

  test("defers an advance click and abandons it after the consumer replaces the workflow", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const first = tour
      .create("first")
      .step({ id: "step-19", content: "First", target, title: "First" })
      .step({ id: "step-20", content: "Second", target, title: "Second" })
      .build();
    const replacement = tour
      .create("replacement")
      .step({ id: "step-21", content: "Replacement", target, title: "Replacement" })
      .step({ id: "step-22", content: "Replacement advance", target, title: "Replacement advance" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(GlowTourAdvanceTrigger, { onClick: () => tour.start(replacement) }),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(first);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStep?.currentProps.content, "Replacement");
    assert.equal(tour.state.get().currentStepIndex, 0);

    await React.act(async () => root.unmount());
  });

  test("keeps native disabled, consumer marker, and aria-disabled coherent when disabled toggles", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("toggle disabled")
      .step({ id: "step-23", content: "First", target, title: "First" })
      .step({ id: "step-24", content: "Second", target, title: "Second" })
      .build();
    let setDisabled!: (disabled: boolean) => void;

    function Harness() {
      const [disabled, updateDisabled] = React.useState(true);
      setDisabled = updateDisabled;
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover),
        React.createElement(GlowTourAdvanceTrigger, { disabled }),
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, true);
    assert.equal(advance?.getAttribute("data-glow-tour-consumer-disabled"), "true");
    assert.equal(advance?.getAttribute("aria-disabled"), "true");

    await React.act(async () => setDisabled(false));
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.hasAttribute("data-glow-tour-consumer-disabled"), false);
    assert.equal(advance?.getAttribute("aria-disabled"), "false");
    await React.act(async () => {
      advance?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    assert.equal(tour.state.get().currentStepIndex, 1);

    await React.act(async () => root.unmount());
  });

  test("treats a custom child button's disabled prop as consumer disabled", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourAdvanceTrigger, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("child disabled")
      .step({ id: "step-25", content: "First", target, title: "First" })
      .step({ id: "step-26", content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTourRoot,
          { tour },
          React.createElement(GlowTourPopover),
          React.createElement(
            GlowTourAdvanceTrigger,
            null,
            React.createElement("button", {
              disabled: true,
              onClick: (event) => event.preventDefault(),
            }),
          ),
        ),
      );
    });
    await React.act(async () => {
      await tour.start(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, true);
    assert.equal(advance?.getAttribute("data-glow-tour-consumer-disabled"), "true");
    assert.equal(advance?.getAttribute("aria-disabled"), "true");
    advance?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    await React.act(async () => root.unmount());
  });

  test("keeps consumer-disabled advance triggers disabled after the tour becomes active", async () => {
    const [
      React,
      { createRoot },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourContent,
        GlowTourHeader,
        GlowTourPopover,
        GlowTourRoot,
      },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("consumer disabled")
      .step({ id: "step-27", content: "First", target, title: "First" })
      .step({ id: "step-28", content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            GlowTourRoot,
            { tour },
            React.createElement(
              React.Fragment,
              null,
              React.createElement(GlowTourPopover, null),
              React.createElement(GlowTourHeader, null),
              React.createElement(GlowTourContent, null),
              React.createElement(GlowTourAdvanceTrigger, {
                disabled: true,
                finishLabel: "Complete",
                advanceLabel: "Continue",
              }),
            ),
          ),
        ),
      );
    });
    const rootElement = container.querySelector<HTMLElement>("[data-glow-tour-root]");
    const popover = container.querySelector<HTMLElement>("[data-glow-tour-popover]");
    const header = container.querySelector<HTMLElement>("[data-glow-tour-header]");
    const content = container.querySelector<HTMLElement>("[data-glow-tour-content]");
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");

    assert.equal(rootElement?.id, "glow-tour-root");
    assert.equal(popover?.getAttribute("aria-labelledby"), header?.id);
    assert.equal(popover?.getAttribute("aria-describedby"), content?.id);
    assert.equal(advance?.getAttribute("aria-controls"), popover?.id);
    assert.equal(advance?.disabled, true);
    await React.act(async () => {
      await tour.start(workflow);
    });
    assert.equal(advance?.disabled, true);
    assert.equal(advance?.textContent, "Continue");
    advance?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);
    await React.act(async () => {
      await tour.advance();
    });
    assert.equal(advance?.textContent, "Complete");

    await React.act(async () => {
      root.unmount();
    });
    assert.equal(rootElement?.id, "");
  });

  test("replaces the root tour and renders the replacement snapshot", async () => {
    const [
      React,
      { createRoot },
      { createGlowTour, GlowTourContent, GlowTourPopover, GlowTourRoot },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const first = createGlowTour();
    const second = createGlowTour();
    const firstWorkflow = first
      .create("first")
      .step({ id: "step-29", content: "First tour", target, title: "First" })
      .build();
    const secondWorkflow = second
      .create("second")
      .step({ id: "step-30", content: "Second tour", target, title: "Second" })
      .build();
    let replaceTour!: (tour: typeof second) => void;

    function Harness() {
      const [tour, setTour] = React.useState(first);
      replaceTour = setTour;
      return React.createElement(
        GlowTourRoot,
        { tour },
        React.createElement(GlowTourPopover),
        React.createElement(GlowTourContent, null),
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await first.start(firstWorkflow);
    });
    assert.equal(container.textContent, "First tour");

    await React.act(async () => {
      replaceTour(second);
    });
    await React.act(async () => {
      await second.start(secondWorkflow);
    });
    assert.equal(container.textContent, "Second tour");

    await React.act(async () => {
      root.unmount();
    });
  });

  test("passes the shared adapter acceptance contract with sibling roots", async () => {
    const [
      React,
      { createRoot },
      {
        createGlowTour,
        GlowTourAdvanceTrigger,
        GlowTourContent,
        GlowTourHeader,
        GlowTourPopover,
        GlowTourRoot,
      },
    ] = await Promise.all([import("react"), import("react-dom/client"), import("./index")]);
    const container = document.createElement("div");
    const primaryTarget = document.createElement("button");
    const secondaryTarget = document.createElement("button");
    document.body.append(container, primaryTarget, secondaryTarget);
    const primaryTour = createGlowTour();
    const secondaryTour = createGlowTour();
    const root = createRoot(container);
    const actTour = (tour: typeof primaryTour) => ({
      async advance() {
        await React.act(() => tour.advance());
      },
      async cancel() {
        await React.act(() => tour.cancel());
      },
      create: tour.create.bind(tour),
      dispose() {
        React.act(() => tour.dispose());
      },
      async goTo(id: string) {
        await React.act(() => tour.goTo(id));
      },
      hidePopover() {
        React.act(() => tour.hidePopover());
      },
      async previous() {
        await React.act(() => tour.previous());
      },
      showPopover() {
        React.act(() => tour.showPopover());
      },
      async start(workflow: Parameters<typeof tour.start>[0]) {
        await React.act(() => tour.start(workflow));
      },
      state: tour.state,
    });

    await React.act(async () => {
      root.render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            GlowTourRoot,
            { idPrefix: "react-primary", tour: primaryTour },
            React.createElement(GlowTourPopover),
            React.createElement(GlowTourHeader),
            React.createElement(GlowTourContent),
            React.createElement(GlowTourAdvanceTrigger),
          ),
          React.createElement(
            GlowTourRoot,
            { idPrefix: "react-secondary", tour: secondaryTour },
            React.createElement(GlowTourPopover),
            React.createElement(GlowTourHeader),
            React.createElement(GlowTourContent),
            React.createElement(GlowTourAdvanceTrigger),
          ),
        ),
      );
    });
    const [primaryRoot, secondaryRoot] = Array.from(
      container.querySelectorAll<HTMLElement>("[data-glow-tour-root]"),
    );
    assert.ok(primaryRoot);
    assert.ok(secondaryRoot);

    await runAdapterAcceptance({
      content(value) {
        return value;
      },
      name: "react",
      async mountDuplicatePrimary() {
        const duplicateContainer = document.createElement("div");
        document.body.append(duplicateContainer);
        const duplicateRoot = createRoot(duplicateContainer);
        let mountError: unknown;
        try {
          await React.act(async () => {
            duplicateRoot.render(
              React.createElement(
                GlowTourRoot,
                { idPrefix: "react-duplicate", tour: primaryTour },
                React.createElement(GlowTourPopover),
                React.createElement(GlowTourHeader),
                React.createElement(GlowTourContent),
                React.createElement(GlowTourAdvanceTrigger),
              ),
            );
          });
        } catch (error) {
          mountError = error;
        }
        let cleanupError: unknown;
        try {
          await React.act(async () => duplicateRoot.unmount());
        } catch (error) {
          cleanupError = error;
        }
        duplicateContainer.remove();
        if (mountError) throw mountError;
        if (cleanupError) throw cleanupError;
      },
      async mutate(update) {
        await React.act(async () => update());
      },
      primaryRoot,
      primaryTarget,
      primaryTour: actTour(primaryTour),
      secondaryRoot,
      secondaryTarget,
      secondaryTour: actTour(secondaryTour),
      async settle() {
        await React.act(async () => {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        });
      },
      async unmount() {
        await React.act(async () => root.unmount());
        container.remove();
        primaryTarget.remove();
        secondaryTarget.remove();
      },
    });
  });
});
