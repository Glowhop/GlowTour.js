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

describe("react adapter browser behavior", () => {
  test("passes the shared default-tour acceptance contract", async () => {
    const [React, { createRoot }, { createGlowTour, DefaultTour }] = await Promise.all([
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
      async run(workflow: Parameters<typeof tour.run>[0]) {
        await React.act(() => tour.run(workflow));
      },
      state: tour.state,
    };

    await React.act(async () => {
      root.render(React.createElement(DefaultTour, { idPrefix: "react-default", tour }));
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
    const [React, { createRoot }, { createGlowTour, GlowTour, useTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
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
      return React.createElement("output", null, `${state.status}:${state.currentStepIndex}`);
    }
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(Observer),
        ),
      );
    });
    await React.act(async () => {
      await tour.run(workflow);
    });
    assert.equal(container.querySelector("output")?.textContent, "active:0");
    await React.act(async () => tour.advance());
    assert.equal(container.querySelector("output")?.textContent, "active:1");
    await React.act(async () => root.unmount());
  });

  test("keeps nested tour controls isolated from the outer root", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
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
    const root = createRoot(container);
    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { idPrefix: "outer", tour: outer },
          React.createElement(GlowTour.Popover),
          React.createElement(GlowTour.AdvanceTrigger),
          React.createElement(
            GlowTour.Root,
            { idPrefix: "inner", tour: inner },
            React.createElement(GlowTour.Popover),
            React.createElement(GlowTour.AdvanceTrigger),
          ),
        ),
      );
    });
    await React.act(async () => {
      await outer.run(workflow(outer, outerTarget, "outer"));
      await inner.run(workflow(inner, innerTarget, "inner"));
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
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
    function Harness() {
      const [disabledFirst, updateDisabledFirst] = React.useState(true);
      setDisabledFirst = updateDisabledFirst;
      const disabled = React.createElement(GlowTour.AdvanceTrigger, { disabled: true });
      const enabled = React.createElement(GlowTour.AdvanceTrigger);
      return React.createElement(
        GlowTour.Root,
        { tour },
        React.createElement(GlowTour.Popover),
        disabledFirst ? disabled : enabled,
        disabledFirst ? enabled : disabled,
      );
    }
    const root = createRoot(container);
    await React.act(async () => root.render(React.createElement(Harness)));
    await React.act(async () => {
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("custom shortcuts")
      .step({
        content: "First",
        popover: { keyboardShortcuts: { advance: ["N"] } },
        target,
        title: "First",
      })
      .step({ content: "Second", target, title: "Second" })
      .build();
    let show!: () => void;
    function Harness() {
      const [visible, setVisible] = React.useState(false);
      show = () => setVisible(true);
      return React.createElement(
        GlowTour.Root,
        { tour },
        React.createElement(GlowTour.Popover),
        visible ? React.createElement(GlowTour.AdvanceTrigger) : null,
      );
    }
    const root = createRoot(container);
    await React.act(async () => root.render(React.createElement(Harness)));
    await React.act(async () => {
      await tour.run(workflow);
      show();
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.getAttribute("aria-keyshortcuts"), "N");
    await React.act(async () => root.unmount());
  });

  test("delegates commands to controls that appear while a tour is active", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
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

    function Harness() {
      const [showAdvance, updateShowAdvance] = React.useState(false);
      setShowAdvance = updateShowAdvance;
      return React.createElement(
        GlowTour.Root,
        { tour },
        React.createElement(GlowTour.Popover),
        React.createElement(GlowTour.CancelTrigger),
        React.createElement(GlowTour.BackTrigger),
        showAdvance ? React.createElement(GlowTour.AdvanceTrigger) : null,
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await tour.run(workflow);
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
      await Promise.resolve();
    });
    assert.equal(tour.state.get().status, "cancelled");

    await React.act(async () => {
      await tour.run(workflow);
      await tour.advance();
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const back = container.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
    assert.equal(back?.disabled, false);
    assert.equal(back?.getAttribute("aria-keyshortcuts"), "ArrowLeft Backspace");
    await React.act(async () => {
      back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    assert.equal(tour.state.get().currentStepIndex, 0);

    await React.act(async () => setShowAdvance(true));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    assert.equal(advance?.disabled, false);
    assert.equal(advance?.getAttribute("aria-keyshortcuts"), "Enter ArrowRight");
    await React.act(async () => {
      advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    assert.equal(tour.state.get().currentStepIndex, 1);

    await React.act(async () => root.unmount());
  });

  test("composes custom child and wrapper click handlers before navigation", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("composed handlers")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    let childClicks = 0;
    let wrapperClicks = 0;
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(
            GlowTour.AdvanceTrigger,
            { onClick: () => (wrapperClicks += 1) },
            React.createElement("button", { onClick: () => (childClicks += 1) }),
          ),
        ),
      );
    });
    await React.act(async () => {
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("prevented")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(GlowTour.AdvanceTrigger, {
            onClick: (event) => event.preventDefault(),
          }),
        ),
      );
    });
    await React.act(async () => {
      await tour.run(workflow);
    });
    const advance = container.querySelector<HTMLButtonElement>("[data-glow-tour-advance-trigger]");
    advance?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    assert.equal(tour.state.get().currentStepIndex, 0);

    await React.act(async () => root.unmount());
  });

  test("advances exactly once when a consumer does not prevent a delegated advance click", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    let advances = 0;
    const workflow = tour
      .create("nonpreventing")
      .step({ content: "First", target, title: "First" })
      .beforeAdvance(() => {
        advances += 1;
      })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(GlowTour.AdvanceTrigger),
        ),
      );
    });
    await React.act(async () => {
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const first = tour
      .create("first")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const replacement = tour
      .create("replacement")
      .step({ content: "Replacement", target, title: "Replacement" })
      .step({ content: "Replacement advance", target, title: "Replacement advance" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(GlowTour.AdvanceTrigger, { onClick: () => tour.run(replacement) }),
        ),
      );
    });
    await React.act(async () => {
      await tour.run(first);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
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

    function Harness() {
      const [disabled, updateDisabled] = React.useState(true);
      setDisabled = updateDisabled;
      return React.createElement(
        GlowTour.Root,
        { tour },
        React.createElement(GlowTour.Popover),
        React.createElement(GlowTour.AdvanceTrigger, { disabled }),
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    const target = document.createElement("button");
    document.body.append(container, target);
    const tour = createGlowTour();
    const workflow = tour
      .create("child disabled")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          GlowTour.Root,
          { tour },
          React.createElement(GlowTour.Popover),
          React.createElement(
            GlowTour.AdvanceTrigger,
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
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const tour = createGlowTour();
    const workflow = tour
      .create("consumer disabled")
      .step({ content: "First", target, title: "First" })
      .step({ content: "Second", target, title: "Second" })
      .build();
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            GlowTour.Root,
            { tour },
            React.createElement(
              React.Fragment,
              null,
              React.createElement(GlowTour.Popover, null),
              React.createElement(GlowTour.Header, null),
              React.createElement(GlowTour.Content, null),
              React.createElement(GlowTour.AdvanceTrigger, {
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
      await tour.run(workflow);
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
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const target = document.createElement("button");
    document.body.append(target);
    const first = createGlowTour();
    const second = createGlowTour();
    const firstWorkflow = first
      .create("first")
      .step({ content: "First tour", target, title: "First" })
      .build();
    const secondWorkflow = second
      .create("second")
      .step({ content: "Second tour", target, title: "Second" })
      .build();
    let replaceTour!: (tour: typeof second) => void;

    function Harness() {
      const [tour, setTour] = React.useState(first);
      replaceTour = setTour;
      return React.createElement(
        GlowTour.Root,
        { tour },
        React.createElement(GlowTour.Popover),
        React.createElement(GlowTour.Content, null),
      );
    }

    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(Harness));
    });
    await React.act(async () => {
      await first.run(firstWorkflow);
    });
    assert.equal(container.textContent, "First tour");

    await React.act(async () => {
      replaceTour(second);
    });
    await React.act(async () => {
      await second.run(secondWorkflow);
    });
    assert.equal(container.textContent, "Second tour");

    await React.act(async () => {
      root.unmount();
    });
  });

  test("passes the shared adapter acceptance contract with sibling roots", async () => {
    const [React, { createRoot }, { createGlowTour, GlowTour }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./index"),
    ]);
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
      async goToStep(index: number) {
        await React.act(() => tour.goToStep(index));
      },
      async previous() {
        await React.act(() => tour.previous());
      },
      async run(workflow: Parameters<typeof tour.run>[0]) {
        await React.act(() => tour.run(workflow));
      },
      state: tour.state,
    });

    await React.act(async () => {
      root.render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            GlowTour.Root,
            { idPrefix: "react-primary", tour: primaryTour },
            React.createElement(GlowTour.Popover),
            React.createElement(GlowTour.Header),
            React.createElement(GlowTour.Content),
            React.createElement(GlowTour.AdvanceTrigger),
          ),
          React.createElement(
            GlowTour.Root,
            { idPrefix: "react-secondary", tour: secondaryTour },
            React.createElement(GlowTour.Popover),
            React.createElement(GlowTour.Header),
            React.createElement(GlowTour.Content),
            React.createElement(GlowTour.AdvanceTrigger),
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
                GlowTour.Root,
                { idPrefix: "react-duplicate", tour: primaryTour },
                React.createElement(GlowTour.Popover),
                React.createElement(GlowTour.Header),
                React.createElement(GlowTour.Content),
                React.createElement(GlowTour.AdvanceTrigger),
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
