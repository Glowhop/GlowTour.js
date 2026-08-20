import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

type VanillaRuntime = typeof import("./index");

let window: Window;
let runtime: VanillaRuntime;

beforeAll(async () => {
  window = new Window();
  Object.assign(globalThis, {
    Event: window.Event,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    Node: window.Node,
    ResizeObserver: window.ResizeObserver,
    SVGElement: window.SVGElement,
    SVGSVGElement: window.SVGSVGElement,
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    customElements: window.customElements,
    document: window.document,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    window,
  });
  runtime = await import("./index");
});

beforeEach(() => document.body.replaceChildren());
afterAll(() => window.close());

async function settle() {
  await Promise.resolve();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

function root(tour: ReturnType<VanillaRuntime["createGlowTour"]>, idPrefix?: string) {
  const element = document.createElement("glow-tour-root");
  if (idPrefix) element.setAttribute("id-prefix", idPrefix);
  element.tour = tour;
  return element;
}

function workflow(
  tour: ReturnType<VanillaRuntime["createGlowTour"]>,
  target: HTMLElement,
  name: string,
) {
  return tour
    .create(name)
    .step({ content: `${name} one`, target, title: `${name} one` })
    .step({ content: `${name} two`, target, title: `${name} two` })
    .finish();
}

describe("vanilla adapter browser behavior", () => {
  test("connects a tour supplied before or after root connection and releases it on null/remount", async () => {
    const first = runtime.createGlowTour();
    const second = runtime.createGlowTour();
    const beforeConnect = root(first, "before");
    const afterConnect = document.createElement("glow-tour-root");
    document.body.append(beforeConnect, afterConnect);
    afterConnect.tour = second;
    await settle();
    assert.equal(beforeConnect.id, "before-root");
    assert.equal(afterConnect.id, "glow-tour-root");
    beforeConnect.tour = null;
    await settle();
    await assert.rejects(() => first.run(first.create("released").finish()), /connected root/i);
    beforeConnect.tour = first;
    await assert.doesNotReject(() => first.run(first.create("remounted").finish()));
    beforeConnect.remove();
    await assert.rejects(() => first.run(first.create("removed").finish()), /connected root/i);
  });

  test("batches root tour and ID-prefix replacement into one scoped lease", async () => {
    const calls: string[] = [];
    const bridgeSymbol = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
    const fakeTour = (name: string) => {
      const tour = {};
      Object.defineProperty(tour, bridgeSymbol, {
        configurable: true,
        value: {
          connectRoot: ({ idPrefix }: { idPrefix?: string }) => {
            const prefix = idPrefix ?? "glow-tour";
            calls.push(`connect:${name}:${prefix}`);
            return {
              bindOverlay: () => () => {},
              bindPointer: () => () => {},
              bindPopover: () => () => {},
              ids: {
                description: `${prefix}-description`,
                popover: `${prefix}-popover`,
                root: `${prefix}-root`,
                title: `${prefix}-title`,
              },
              release: () => calls.push(`release:${name}:${prefix}`),
            };
          },
          version: 1,
        },
      });
      return tour as ReturnType<VanillaRuntime["createGlowTour"]>;
    };
    const element = root(fakeTour("first"), "first");
    document.body.append(element);
    calls.length = 0;
    element.tour = fakeTour("second");
    element.idPrefix = "second";
    await settle();
    assert.deepEqual(calls, ["release:first:first", "connect:second:second"]);
    element.remove();
  });

  test("keeps sibling and nearest nested root controls and generated ARIA isolated", async () => {
    const outer = runtime.createGlowTour();
    const inner = runtime.createGlowTour();
    const sibling = runtime.createGlowTour();
    const outerTarget = document.createElement("button");
    const innerTarget = document.createElement("button");
    const siblingTarget = document.createElement("button");
    const outerRoot = root(outer, "outer");
    const innerRoot = root(inner, "inner");
    const siblingRoot = root(sibling, "sibling");
    outerRoot.innerHTML =
      "<glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content></glow-tour-popover><glow-tour-next-trigger></glow-tour-next-trigger>";
    innerRoot.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-next-trigger></glow-tour-next-trigger>";
    siblingRoot.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-next-trigger></glow-tour-next-trigger>";
    outerRoot.append(innerRoot);
    document.body.append(outerTarget, innerTarget, siblingTarget, outerRoot, siblingRoot);
    await settle();
    await outer.run(workflow(outer, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner"));
    await sibling.run(workflow(sibling, siblingTarget, "sibling"));
    const [outerNext, innerNext, siblingNext] = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-glow-tour-next-trigger]"),
    );
    assert.deepEqual(
      [outerNext, innerNext, siblingNext].map((button) => button.getAttribute("aria-controls")),
      ["outer-popover", "inner-popover", "sibling-popover"],
    );
    assert.equal(
      outerRoot.querySelector("[data-glow-tour-popover]")?.getAttribute("aria-labelledby"),
      "outer-title",
    );
    innerNext.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(outer.state.get().currentStepIndex, 0);
    assert.equal(sibling.state.get().currentStepIndex, 0);
  });

  test("renders dynamic content and binds popover, overlay, and pointer without stale bindings", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const element = root(tour, "dynamic");
    element.innerHTML =
      "<glow-tour-overlay></glow-tour-overlay><glow-tour-pointer>Pointer</glow-tour-pointer><glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content><glow-tour-footer></glow-tour-footer></glow-tour-popover>";
    document.body.append(target, element);
    await settle();
    await tour.run(
      tour.create("dynamic").step({ content: "One", target, title: "Title" }).finish(),
    );
    tour.updateCurrentStep((props) => ({
      ...props,
      content: "Two",
      hideFooter: true,
      title: "Updated",
    }));
    await settle();
    assert.equal(element.querySelector("[data-glow-tour-header]")?.textContent, "Updated");
    assert.equal(element.querySelector("[data-glow-tour-content]")?.textContent, "Two");
    assert.equal(element.querySelector<HTMLElement>("[data-glow-tour-footer]")?.hidden, true);
    assert.ok(element.querySelector("svg[data-glow-tour-overlay]"));
    assert.equal(element.querySelector("[data-glow-tour-pointer-content]")?.textContent, "Pointer");
    const replacement = runtime.createGlowTour();
    element.tour = replacement;
    await settle();
    await assert.rejects(() => tour.run(tour.create("stale").finish()), /connected root/i);
    assert.doesNotThrow(() => element.remove());
  });

  test("delegates Cancel, Back, late Next, consumer disabled state, prevented clicks, and custom shortcuts", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const element = root(tour, "controls");
    element.innerHTML =
      "<glow-tour-back-trigger></glow-tour-back-trigger><glow-tour-cancel-trigger></glow-tour-cancel-trigger>";
    document.body.append(target, element);
    await settle();
    const tourWorkflow = tour
      .create("controls", { popover: { keyboardShortcuts: { next: ["N"] } } })
      .step({ content: "One", target, title: "One" })
      .step({ content: "Two", target, title: "Two" })
      .finish();
    await tour.run(tourWorkflow);
    const cancel = element.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().status, "cancelled");
    await tour.run(tourWorkflow);
    const next = document.createElement("glow-tour-next-trigger");
    const nextButton = document.createElement("button");
    next.append(nextButton);
    element.append(next);
    await settle();
    assert.equal(nextButton.getAttribute("aria-keyshortcuts"), "N");
    nextButton.disabled = true;
    await settle();
    assert.equal(nextButton.getAttribute("aria-disabled"), "true");
    assert.equal(nextButton.getAttribute("data-glow-tour-consumer-disabled"), "true");
    nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    nextButton.disabled = false;
    await settle();
    assert.equal(nextButton.hasAttribute("data-glow-tour-consumer-disabled"), false);
    nextButton.addEventListener("click", (event) => event.preventDefault(), { once: true });
    nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    nextButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "N" }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    const back = element.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("rejects attaching the same live instance to two roots", () => {
    const tour = runtime.createGlowTour();
    const first = root(tour, "first");
    const second = root(tour, "second");
    document.body.append(first);
    assert.throws(() => document.body.append(second), /live root/i);
  });
});
