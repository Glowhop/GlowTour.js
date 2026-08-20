import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

let window: Window;

beforeEach(() => {
  window = new Window();
  Object.assign(globalThis, {
    Event: window.Event,
    HTMLElement: window.HTMLElement,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    Node: window.Node,
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
  test("keeps consumer-disabled next triggers disabled after the tour becomes active", async () => {
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
      .finish();
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
              React.createElement(GlowTour.NextTrigger, {
                disabled: true,
                finishLabel: "Complete",
                nextLabel: "Continue",
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
    const next = container.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");

    assert.equal(rootElement?.id, "glow-tour-root");
    assert.equal(popover?.getAttribute("aria-labelledby"), header?.id);
    assert.equal(popover?.getAttribute("aria-describedby"), content?.id);
    assert.equal(next?.getAttribute("aria-controls"), popover?.id);
    assert.equal(next?.disabled, true);
    await React.act(async () => {
      await tour.run(workflow);
    });
    assert.equal(next?.disabled, true);
    assert.equal(next?.textContent, "Continue");
    next?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    assert.equal(tour.state.get().currentStepIndex, 0);
    await React.act(async () => {
      await tour.advance();
    });
    assert.equal(next?.textContent, "Complete");

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
      .finish();
    const secondWorkflow = second
      .create("second")
      .step({ content: "Second tour", target, title: "Second" })
      .finish();
    let replaceTour!: (tour: typeof second) => void;

    function Harness() {
      const [tour, setTour] = React.useState(first);
      replaceTour = setTour;
      return React.createElement(
        GlowTour.Root,
        { tour },
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
});
