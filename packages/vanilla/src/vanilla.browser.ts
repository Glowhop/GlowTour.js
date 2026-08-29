import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createGlowTour as createCoreGlowTour, type StepContext } from "@glowhop/core-tour";
import { Window } from "happy-dom";
import {
  runAdapterAcceptance,
  runDefaultTourAcceptance,
} from "../../../scripts/adapter-acceptance";
import type { VanillaTourContent } from "./glow-tour";

type VanillaRuntime = typeof import("./index");

let window: Window;
let runtime: VanillaRuntime;
let preUpgradeRoot: HTMLElement;
let preUpgradeTour: ReturnType<typeof createCoreGlowTour<string | Node>>;

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
  preUpgradeTour = createCoreGlowTour<string | Node>();
  preUpgradeRoot = document.createElement("glow-tour-root");
  Object.assign(preUpgradeRoot, { idPrefix: "pre-upgrade", tour: preUpgradeTour });
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
  captureProps?: (props: StepContext<VanillaTourContent>["props"]) => void,
) {
  return tour
    .create(name)
    .step({ content: `${name} one`, target, title: `${name} one` })
    .do(({ props }) => captureProps?.(props))
    .step({ content: `${name} two`, target, title: `${name} two` })
    .build();
}

describe("vanilla adapter browser behavior", () => {
  test("passes the shared default-tour acceptance contract", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const rootElement = runtime.createDefaultTourElement(tour, { idPrefix: "vanilla-default" });
    document.body.append(target, rootElement);
    await settle();

    await runDefaultTourAcceptance({
      content: (value) => value,
      idPrefix: "vanilla-default",
      name: "vanilla default",
      root: rootElement,
      target,
      tour,
      settle,
      async unmount() {
        rootElement.remove();
        target.remove();
        await settle();
      },
    });
  });

  test("passes the shared mounted adapter acceptance contract", async () => {
    const primaryTour = runtime.createGlowTour();
    const secondaryTour = runtime.createGlowTour();
    const primaryTarget = document.createElement("button");
    const secondaryTarget = document.createElement("button");
    const primaryRoot = root(primaryTour, "vanilla-accept-primary");
    const secondaryRoot = root(secondaryTour, "vanilla-accept-secondary");
    primaryRoot.innerHTML =
      "<glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content><glow-tour-advance-trigger></glow-tour-advance-trigger></glow-tour-popover>";
    secondaryRoot.innerHTML =
      "<glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content><glow-tour-advance-trigger></glow-tour-advance-trigger></glow-tour-popover>";
    document.body.append(primaryTarget, secondaryTarget, primaryRoot, secondaryRoot);
    await settle();

    await runAdapterAcceptance({
      content: (value) => value,
      name: "vanilla",
      primaryRoot,
      primaryTarget,
      primaryTour,
      secondaryRoot,
      secondaryTarget,
      secondaryTour,
      mountDuplicatePrimary: async () => {
        const duplicateRoot = root(primaryTour, "vanilla-accept-duplicate");
        let error: unknown;
        let failed = false;
        try {
          document.body.append(duplicateRoot);
          await settle();
        } catch (caught) {
          error = caught;
          failed = true;
        }
        try {
          duplicateRoot.remove();
          await settle();
        } catch (cleanupError) {
          if (!failed) throw cleanupError;
        }
        if (failed) throw error;
      },
      settle,
      unmount: async () => {
        primaryRoot.remove();
        secondaryRoot.remove();
        primaryTarget.remove();
        secondaryTarget.remove();
        await settle();
      },
    });
  });

  test("replays pre-upgrade tour and idPrefix properties before connecting", async () => {
    document.body.append(preUpgradeRoot);
    await settle();
    const root = preUpgradeRoot as unknown as { idPrefix?: string; tour?: unknown } & HTMLElement;
    assert.equal(root.id, "pre-upgrade-root");
    assert.equal(root.idPrefix, "pre-upgrade");
    assert.equal(root.tour, preUpgradeTour);
    await assert.doesNotReject(() => preUpgradeTour.run(preUpgradeTour.create("upgrade").build()));
    root.tour = null;
    await settle();
    await assert.rejects(
      () => preUpgradeTour.run(preUpgradeTour.create("upgrade released").build()),
      /connected root/i,
    );
  });

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
    await assert.rejects(() => first.run(first.create("released").build()), /connected root/i);
    beforeConnect.tour = first;
    await assert.doesNotReject(() => first.run(first.create("remounted").build()));
    beforeConnect.remove();
    await assert.rejects(() => first.run(first.create("removed").build()), /connected root/i);
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
      "<glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content></glow-tour-popover><glow-tour-advance-trigger></glow-tour-advance-trigger>";
    innerRoot.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-advance-trigger></glow-tour-advance-trigger>";
    siblingRoot.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-advance-trigger></glow-tour-advance-trigger>";
    outerRoot.append(innerRoot);
    document.body.append(outerTarget, innerTarget, siblingTarget, outerRoot, siblingRoot);
    await settle();
    await outer.run(workflow(outer, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner"));
    await sibling.run(workflow(sibling, siblingTarget, "sibling"));
    const [outerAdvance, innerAdvance, siblingAdvance] = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-glow-tour-advance-trigger]"),
    );
    assert.deepEqual(
      [outerAdvance, innerAdvance, siblingAdvance].map((button) =>
        button.getAttribute("aria-controls"),
      ),
      ["outer-popover", "inner-popover", "sibling-popover"],
    );
    assert.equal(
      outerRoot.querySelector("[data-glow-tour-popover]")?.getAttribute("aria-labelledby"),
      "outer-title",
    );
    innerAdvance.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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
    let activeProps!: StepContext<VanillaTourContent>["props"];
    await tour.run(
      tour
        .create("dynamic")
        .step({ content: "One", target, title: "Title" })
        .do(({ props }) => {
          activeProps = props;
        })
        .build(),
    );
    activeProps.set((props) => ({
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
    await assert.rejects(() => tour.run(tour.create("stale").build()), /connected root/i);
    assert.doesNotThrow(() => element.remove());
  });

  test("preserves authored element IDs and ARIA relationships across release and remount", async () => {
    const tour = runtime.createGlowTour();
    const rootElement = root(tour, "authored");
    rootElement.innerHTML =
      '<glow-tour-popover id="authored-popover" aria-labelledby="authored-title" aria-describedby="authored-description"><glow-tour-header id="authored-title"></glow-tour-header><glow-tour-content id="authored-description"></glow-tour-content></glow-tour-popover><glow-tour-back-trigger><button aria-controls="authored-popover" aria-label="Authored back">Back</button></glow-tour-back-trigger><glow-tour-advance-trigger><button aria-controls="authored-popover" aria-label="Authored advance">Advance</button></glow-tour-advance-trigger><glow-tour-cancel-trigger><button aria-controls="authored-popover" aria-label="Authored cancel">Cancel</button></glow-tour-cancel-trigger>';
    document.body.append(rootElement);
    await settle();
    const values = Array.from(rootElement.querySelectorAll<HTMLElement>("[id], [aria-controls]"));
    const snapshot = values.map((element) => ({
      controls: element.getAttribute("aria-controls"),
      describedBy: element.getAttribute("aria-describedby"),
      id: element.getAttribute("id"),
      labelledBy: element.getAttribute("aria-labelledby"),
    }));
    rootElement.tour = null;
    await settle();
    assert.deepEqual(
      values.map((element) => ({
        controls: element.getAttribute("aria-controls"),
        describedBy: element.getAttribute("aria-describedby"),
        id: element.getAttribute("id"),
        labelledBy: element.getAttribute("aria-labelledby"),
      })),
      snapshot,
    );
    rootElement.tour = tour;
    await settle();
    assert.deepEqual(
      values.map((element) => ({
        controls: element.getAttribute("aria-controls"),
        describedBy: element.getAttribute("aria-describedby"),
        id: element.getAttribute("id"),
        labelledBy: element.getAttribute("aria-labelledby"),
      })),
      snapshot,
    );
  });

  test("relinquishes managed IDs and ARIA changed by a connected consumer", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const rootElement = root(tour, "consumer-attrs");
    rootElement.innerHTML =
      "<glow-tour-popover><glow-tour-header></glow-tour-header><glow-tour-content></glow-tour-content></glow-tour-popover><glow-tour-advance-trigger><button></button></glow-tour-advance-trigger>";
    document.body.append(target, rootElement);
    let activeProps!: StepContext<VanillaTourContent>["props"];
    await tour.run(
      workflow(tour, target, "consumer attrs", (props) => {
        activeProps = props;
      }),
    );
    await settle();
    const header = rootElement.querySelector<HTMLElement>("glow-tour-header");
    const popover = rootElement.querySelector<HTMLElement>("glow-tour-popover");
    const advance = rootElement.querySelector<HTMLButtonElement>(
      "glow-tour-advance-trigger button",
    );
    assert.ok(header);
    assert.ok(popover);
    assert.ok(advance);
    header.id = "consumer-title";
    popover.setAttribute("aria-labelledby", "consumer-label");
    advance.setAttribute("aria-controls", "consumer-popover");
    advance.setAttribute("aria-label", "Consumer advance");
    activeProps.set((props) => ({ ...props, title: "Updated" }));
    await settle();
    assert.equal(header.id, "consumer-title");
    assert.equal(popover.getAttribute("aria-labelledby"), "consumer-label");
    assert.equal(advance.getAttribute("aria-controls"), "consumer-popover");
    assert.equal(advance.getAttribute("aria-label"), "Consumer advance");
    rootElement.tour = null;
    await settle();
    rootElement.tour = tour;
    await settle();
    assert.equal(header.id, "consumer-title");
    assert.equal(popover.getAttribute("aria-labelledby"), "consumer-label");
    assert.equal(advance.getAttribute("aria-controls"), "consumer-popover");
    assert.equal(advance.getAttribute("aria-label"), "Consumer advance");
  });

  test("releases generated child bindings when moved out and adopts the destination root", async () => {
    const first = runtime.createGlowTour();
    const second = runtime.createGlowTour();
    const firstRoot = root(first, "move-first");
    const secondRoot = root(second, "move-second");
    const popover = document.createElement("glow-tour-popover");
    const header = document.createElement("glow-tour-header");
    popover.append(header);
    firstRoot.append(popover);
    document.body.append(firstRoot, secondRoot);
    await settle();
    assert.equal(popover.id, "move-first-popover");
    document.body.append(popover);
    await settle();
    assert.equal(popover.hasAttribute("id"), false);
    assert.equal(popover.hasAttribute("aria-labelledby"), false);
    secondRoot.append(popover);
    await settle();
    assert.equal(popover.id, "move-second-popover");
    assert.equal(header.id, "move-second-title");
  });

  test("keeps consumer disabled intent through property and attribute changes in idle and active states", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const element = root(tour, "consumer");
    element.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-back-trigger><button></button></glow-tour-back-trigger><glow-tour-advance-trigger><button></button></glow-tour-advance-trigger>";
    document.body.append(target, element);
    await settle();
    const button = element.querySelector<HTMLButtonElement>("glow-tour-advance-trigger button");
    const back = element.querySelector<HTMLButtonElement>("glow-tour-back-trigger button");
    assert.ok(button);
    assert.ok(back);
    button.disabled = true;
    const tourWorkflow = workflow(tour, target, "consumer");
    await tour.run(tourWorkflow);
    await settle();
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.removeAttribute("disabled");
    await settle();
    assert.equal(button.disabled, false);
    assert.equal(button.getAttribute("aria-disabled"), "false");
    button.setAttribute("disabled", "");
    await settle();
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.removeAttribute("disabled");
    await settle();
    assert.equal(button.disabled, false);
    back.disabled = true;
    await settle();
    assert.equal(back.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(back.disabled, true);
    back.disabled = false;
    await settle();
    assert.equal(back.disabled, false);
  });

  test("treats authored aria-disabled as consumer intent through reconnect and toggles", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const rootElement = root(tour, "aria-disabled");
    rootElement.innerHTML =
      '<glow-tour-popover></glow-tour-popover><glow-tour-advance-trigger><button aria-disabled="true">Advance</button></glow-tour-advance-trigger>';
    document.body.append(target, rootElement);
    await tour.run(workflow(tour, target, "aria disabled"));
    await settle();
    const trigger = rootElement.querySelector<HTMLElement>("glow-tour-advance-trigger");
    const button = trigger?.querySelector<HTMLButtonElement>("button");
    assert.ok(trigger);
    assert.ok(button);
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    trigger.remove();
    await settle();
    rootElement.append(trigger);
    await settle();
    assert.equal(button.getAttribute("aria-disabled"), "true");
    assert.equal(button.disabled, true);
    button.setAttribute("aria-disabled", "false");
    await settle();
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute("data-glow-tour-consumer-disabled"), false);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    button.setAttribute("aria-disabled", "true");
    await settle();
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.removeAttribute("aria-disabled");
    await settle();
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute("data-glow-tour-consumer-disabled"), false);
  });

  test("synchronizes same-tick aria-disabled intent across trigger remounts", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const rootElement = root(tour, "aria-same-tick");
    rootElement.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-advance-trigger><button>Advance</button></glow-tour-advance-trigger>";
    document.body.append(target, rootElement);
    await tour.run(workflow(tour, target, "aria same tick"));
    await settle();
    const trigger = rootElement.querySelector<HTMLElement>("glow-tour-advance-trigger");
    const button = trigger?.querySelector<HTMLButtonElement>("button");
    assert.ok(trigger);
    assert.ok(button);
    button.setAttribute("aria-disabled", "true");
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.setAttribute("aria-disabled", "false");
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute("data-glow-tour-consumer-disabled"), false);
    trigger.remove();
    rootElement.append(trigger);
    assert.equal(button.getAttribute("aria-disabled"), "false");
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute("data-glow-tour-consumer-disabled"), false);
    button.setAttribute("aria-disabled", "true");
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    trigger.remove();
    rootElement.append(trigger);
    assert.equal(button.getAttribute("aria-disabled"), "true");
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
  });

  test("restores preexisting button descriptors and preserves consumer replacements", async () => {
    const tour = runtime.createGlowTour();
    const rootElement = root(tour, "descriptors");
    const trigger = document.createElement("glow-tour-advance-trigger");
    const button = document.createElement("button");
    const nativeDisabled = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(button),
      "disabled",
    );
    assert.ok(nativeDisabled?.get);
    assert.ok(nativeDisabled?.set);
    const originalDisabled: PropertyDescriptor = {
      configurable: true,
      get: () => nativeDisabled.get?.call(button),
      set: (value: boolean) => nativeDisabled.set?.call(button, value),
    };
    const originalSetAttribute: PropertyDescriptor = {
      configurable: true,
      value: (name: string, value: string) =>
        HTMLElement.prototype.setAttribute.call(button, name, value),
    };
    const originalRemoveAttribute: PropertyDescriptor = {
      configurable: true,
      value: (name: string) => HTMLElement.prototype.removeAttribute.call(button, name),
    };
    Object.defineProperties(button, {
      disabled: originalDisabled,
      removeAttribute: originalRemoveAttribute,
      setAttribute: originalSetAttribute,
    });
    trigger.append(button);
    rootElement.append(trigger);
    document.body.append(rootElement);
    await settle();
    trigger.remove();
    await settle();
    assert.equal(Object.getOwnPropertyDescriptor(button, "disabled")?.get, originalDisabled.get);
    assert.equal(
      Object.getOwnPropertyDescriptor(button, "setAttribute")?.value,
      originalSetAttribute.value,
    );
    assert.equal(
      Object.getOwnPropertyDescriptor(button, "removeAttribute")?.value,
      originalRemoveAttribute.value,
    );
    rootElement.append(trigger);
    await settle();
    const replacement: PropertyDescriptor = {
      configurable: true,
      get: () => false,
      set: () => {},
    };
    const replacementSetAttribute: PropertyDescriptor = {
      configurable: true,
      value: () => {},
    };
    const replacementRemoveAttribute: PropertyDescriptor = {
      configurable: true,
      value: () => {},
    };
    Object.defineProperties(button, {
      disabled: replacement,
      removeAttribute: replacementRemoveAttribute,
      setAttribute: replacementSetAttribute,
    });
    trigger.remove();
    await settle();
    assert.equal(Object.getOwnPropertyDescriptor(button, "disabled")?.get, replacement.get);
    assert.equal(
      Object.getOwnPropertyDescriptor(button, "setAttribute")?.value,
      replacementSetAttribute.value,
    );
    assert.equal(
      Object.getOwnPropertyDescriptor(button, "removeAttribute")?.value,
      replacementRemoveAttribute.value,
    );
  });

  test("keeps disabled tracking when an own setAttribute descriptor is non-configurable", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const rootElement = root(tour, "non-configurable-set-attribute");
    const trigger = document.createElement("glow-tour-advance-trigger");
    const button = document.createElement("button");
    const nativeSetAttribute = button.setAttribute.bind(button);
    const setAttribute: PropertyDescriptor = {
      configurable: false,
      value: (name: string, value: string) => nativeSetAttribute(name, value),
    };
    Object.defineProperty(button, "setAttribute", setAttribute);
    trigger.append(button);
    rootElement.append(trigger);
    rootElement.append(document.createElement("glow-tour-popover"));
    document.body.append(target, rootElement);
    await settle();
    button.disabled = true;
    await tour.run(workflow(tour, target, "non configurable"));
    await settle();
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute("data-glow-tour-consumer-disabled"), "true");
    button.disabled = false;
    button.setAttribute("aria-disabled", "true");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    button.setAttribute("aria-disabled", "false");
    button.disabled = false;
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute("data-glow-tour-consumer-disabled"), false);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    trigger.remove();
    await settle();
    assert.equal(
      Object.getOwnPropertyDescriptor(button, "setAttribute")?.value,
      setAttribute.value,
    );
  });

  test("restores trigger ownership and keeps generated last-step labels dynamic after reconnect", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const element = root(tour, "trigger-reconnect");
    element.innerHTML =
      '<glow-tour-popover></glow-tour-popover><glow-tour-advance-trigger finish-label="Finished"><button aria-label="Authored advance">Authored text</button></glow-tour-advance-trigger><glow-tour-advance-trigger finish-label="Finished"></glow-tour-advance-trigger>';
    document.body.append(target, element);
    await settle();
    const [trigger, generatedTrigger] = Array.from(
      element.querySelectorAll<HTMLElement>("glow-tour-advance-trigger"),
    );
    const button = trigger.querySelector<HTMLButtonElement>("button");
    const generatedButton = generatedTrigger.querySelector<HTMLButtonElement>("button");
    assert.ok(button);
    assert.ok(generatedButton);
    trigger.remove();
    generatedTrigger.remove();
    await settle();
    assert.equal(button.getAttribute("aria-label"), "Authored advance");
    assert.equal(button.textContent, "Authored text");
    element.append(trigger);
    element.append(generatedTrigger);
    await tour.run(tour.create("reconnect").step({ content: "One", target, title: "One" }).build());
    await settle();
    assert.equal(button.getAttribute("aria-label"), "Authored advance");
    assert.equal(button.textContent, "Authored text");
    assert.equal(generatedButton.getAttribute("aria-label"), "Finished");
    assert.equal(generatedButton.textContent, "Finished");
  });

  test("delegates Cancel, Back, late Advance, consumer disabled state, prevented clicks, and custom shortcuts", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    const element = root(tour, "controls");
    element.innerHTML =
      "<glow-tour-popover></glow-tour-popover><glow-tour-back-trigger></glow-tour-back-trigger><glow-tour-cancel-trigger></glow-tour-cancel-trigger>";
    document.body.append(target, element);
    await settle();
    const tourWorkflow = tour
      .create("controls", { popover: { keyboardShortcuts: { advance: ["N"] } } })
      .step({ content: "One", target, title: "One" })
      .step({ content: "Two", target, title: "Two" })
      .build();
    await tour.run(tourWorkflow);
    const firstBack = element.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
    assert.equal(firstBack?.disabled, true);
    assert.equal(firstBack?.getAttribute("aria-disabled"), "true");
    const cancel = element.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().status, "cancelled");
    await tour.run(tourWorkflow);
    const advance = document.createElement("glow-tour-advance-trigger");
    const advanceButton = document.createElement("button");
    advance.append(advanceButton);
    element.append(advance);
    await settle();
    assert.equal(advanceButton.getAttribute("aria-keyshortcuts"), "N");
    advanceButton.disabled = true;
    await settle();
    assert.equal(advanceButton.getAttribute("aria-disabled"), "true");
    assert.equal(advanceButton.getAttribute("data-glow-tour-consumer-disabled"), "true");
    advanceButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    advanceButton.disabled = false;
    await settle();
    assert.equal(advanceButton.hasAttribute("data-glow-tour-consumer-disabled"), false);
    advanceButton.addEventListener("click", (event) => event.preventDefault(), { once: true });
    advanceButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    advanceButton.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "N" }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    const back = element.querySelector<HTMLButtonElement>("[data-glow-tour-previous-trigger]");
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
