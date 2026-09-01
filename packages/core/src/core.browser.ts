import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { connectGlowTourRoot } from "./adapter";
import { createGlowTour } from "./index";

let foreignWindow: Window;
let rootWindow: Window;

type WindowAddEventListener = (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => void;
type WindowRemoveEventListener = (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
) => void;

beforeEach(() => {
  foreignWindow = new Window();
  rootWindow = new Window();
  Object.defineProperties(foreignWindow, {
    devicePixelRatio: { configurable: true, value: 1 },
    innerHeight: { configurable: true, value: 500 },
    innerWidth: { configurable: true, value: 900 },
  });
  Object.defineProperties(rootWindow, {
    devicePixelRatio: { configurable: true, value: 2 },
    innerHeight: { configurable: true, value: 360 },
    innerWidth: { configurable: true, value: 640 },
  });
  Object.assign(globalThis, {
    Element: foreignWindow.Element,
    HTMLElement: foreignWindow.HTMLElement,
    KeyboardEvent: foreignWindow.KeyboardEvent,
    MutationObserver: foreignWindow.MutationObserver,
    Node: foreignWindow.Node,
    SVGSVGElement: foreignWindow.SVGSVGElement,
    cancelAnimationFrame: foreignWindow.cancelAnimationFrame.bind(foreignWindow),
    document: foreignWindow.document,
    requestAnimationFrame: foreignWindow.requestAnimationFrame.bind(foreignWindow),
    window: foreignWindow,
  });
});

afterEach(() => {
  foreignWindow.close();
  rootWindow.close();
});

function rectangle(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect;
}

async function waitFor(condition: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}`);
    await new Promise<void>((resolve) => rootWindow.setTimeout(resolve, 1));
  }
}

describe("core browser realm isolation", () => {
  test("runs a tour entirely in the registered root realm", async () => {
    const scheduledFrames: number[] = [];
    const cancelledFrames: number[] = [];
    let disconnectedObservers = 0;
    let observedControls = 0;
    let rootKeydownAdds = 0;
    let rootKeydownRemovals = 0;
    const rootAddEventListener = rootWindow.addEventListener.bind(
      rootWindow,
    ) as unknown as WindowAddEventListener;
    const rootRemoveEventListener = rootWindow.removeEventListener.bind(
      rootWindow,
    ) as unknown as WindowRemoveEventListener;
    Object.defineProperties(rootWindow, {
      MutationObserver: {
        configurable: true,
        value: class {
          constructor(_callback: MutationCallback) {
            observedControls += 1;
          }

          disconnect() {
            disconnectedObservers += 1;
          }

          observe(_target: Node, _options: MutationObserverInit) {}
        },
      },
      addEventListener: {
        configurable: true,
        value: (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions,
        ) => {
          if (type === "keydown") rootKeydownAdds += 1;
          rootAddEventListener(type, listener, options);
        },
      },
      cancelAnimationFrame: {
        configurable: true,
        value: (id: number) => void cancelledFrames.push(id),
      },
      removeEventListener: {
        configurable: true,
        value: (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | EventListenerOptions,
        ) => {
          if (type === "keydown") rootKeydownRemovals += 1;
          rootRemoveEventListener(type, listener, options);
        },
      },
      requestAnimationFrame: {
        configurable: true,
        value: () => {
          const id = scheduledFrames.length + 1;
          scheduledFrames.push(id);
          return id;
        },
      },
    });
    const tour = createGlowTour<string>();
    const document = rootWindow.document as unknown as Document;
    const foreignDocument = foreignWindow.document as unknown as Document;
    const root = document.createElement("section");
    const target = document.createElement("button");
    const foreignTarget = foreignDocument.createElement("button");
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const popover = document.createElement("aside");
    const advance = document.createElement("button");

    target.id = "realm-target";
    foreignTarget.id = target.id;
    advance.setAttribute("data-glow-tour-advance-trigger", "");
    target.getBoundingClientRect = () => rectangle(10.25, 20.25, 30.25, 40.25);
    popover.getBoundingClientRect = () => rectangle(0, 0, 100, 60);
    overlay.append(path);
    popover.append(advance);
    root.append(overlay, popover);
    document.body.append(target, root);
    foreignDocument.body.append(foreignTarget);

    const binding = connectGlowTourRoot(tour, { idPrefix: "realm", root });
    binding.bindOverlay(overlay);
    binding.bindPopover(popover);
    const workflow = tour
      .create("root realm", { animated: false })
      .step({ content: "One", target: "#realm-target", title: "One" })
      .step({ content: "Two", target: "#realm-target", title: "Two" })
      .build();

    await tour.run(workflow);

    assert.equal(tour.state.get().currentStep?.target, target);
    assert.equal(document.activeElement, advance);
    assert.equal(overlay.getAttribute("viewBox"), "0 0 640 360");
    assert.match(path.style.getPropertyValue("d"), /H640 V360/);
    assert.match(path.style.getPropertyValue("d"), /M-5\.5,16\.5/);

    rootWindow.dispatchEvent(new rootWindow.KeyboardEvent("keydown", { key: "Enter" }));
    await waitFor(() => tour.state.get().currentStepIndex === 1, "keyboard navigation");
    assert.equal(tour.state.get().status, "active");

    binding.release();

    assert.ok(rootKeydownAdds > 0);
    assert.equal(rootKeydownRemovals, rootKeydownAdds);
    assert.ok(scheduledFrames.length > 0);
    assert.deepEqual(cancelledFrames, scheduledFrames);
    assert.ok(observedControls > 0);
    assert.equal(disconnectedObservers, observedControls);
  });
});
