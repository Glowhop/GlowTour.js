import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type {
  GlowTourOptions,
  StartOptions,
  StepPropsStore,
  Tour,
  TourState,
  WorkflowDefinition,
} from "./index";
import * as runtime from "./index";

const tour: Tour = runtime.createGlowTour();
const tourState: TourState | null = null;
const stepPropsStore: StepPropsStore | null = null;
const workflowDefinition: WorkflowDefinition | null = null;
const startOptions: StartOptions | null = null;
const glowTourOptions: GlowTourOptions = {
  onSubscriberError: (error) => {
    const typedError: Error = error;
    void typedError;
  },
};
void [tour, tourState, stepPropsStore, workflowDefinition, startOptions, glowTourOptions];

describe("vanilla adapter public contract", () => {
  test("forwards subscriber error handlers to the core tour", () => {
    const errors: Error[] = [];
    const tour = runtime.createGlowTour({
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });

    tour.state.subscribe(() => {
      throw new Error("vanilla subscriber failure");
    });

    assert.deepEqual(
      errors.map((error) => error.message),
      ["vanilla subscriber failure"],
    );
  });

  test("exports the Vanilla tour factories and intentional element metadata", () => {
    assert.deepEqual(Object.keys(runtime).sort(), [
      "GLOW_TOUR_ELEMENT_NAMES",
      "createGlowTour",
      "registerGlowTourElements",
    ]);
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal("glowTour" in runtime, false);
    assert.equal("createTourStore" in runtime, false);
    assert.equal("TourStore" in runtime, false);
    assert.equal("Builder" in runtime, false);
    assert.deepEqual(runtime.GLOW_TOUR_ELEMENT_NAMES, [
      "glow-tour-root",
      "glow-tour-header",
      "glow-tour-content",
      "glow-tour-footer",
      "glow-tour-popover",
      "glow-tour-pointer",
      "glow-tour-previous-trigger",
      "glow-tour-advance-trigger",
      "glow-tour-cancel-trigger",
      "glow-tour-overlay",
      "glow-tour-default",
    ]);
  });

  test("is safe to import without DOM globals", async () => {
    const originalHTMLElement = globalThis.HTMLElement;
    const originalCustomElements = globalThis.customElements;
    const originalDocument = globalThis.document;
    try {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: undefined },
        customElements: { configurable: true, value: undefined },
        document: { configurable: true, value: undefined },
      });
      const noDomRuntime = await import(`./index?no-dom=${Date.now()}`);
      assert.equal(typeof noDomRuntime.createGlowTour, "function");
      assert.doesNotThrow(() => noDomRuntime.registerGlowTourElements());
    } finally {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: originalHTMLElement },
        customElements: { configurable: true, value: originalCustomElements },
        document: { configurable: true, value: originalDocument },
      });
    }
  });

  test("keeps the main entry pure and exposes explicit registration", async () => {
    const originalHTMLElement = globalThis.HTMLElement;
    const originalCustomElements = globalThis.customElements;
    const definitions = new Map<string, CustomElementConstructor>();
    class FakeHTMLElement {}
    const registry = {
      define(name: string, elementConstructor: CustomElementConstructor) {
        definitions.set(name, elementConstructor);
      },
      get(name: string) {
        return definitions.get(name);
      },
    } as unknown as CustomElementRegistry;
    try {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: FakeHTMLElement },
        customElements: { configurable: true, value: registry },
      });
      const pureRuntime = await import(`./index?pure=${Date.now()}`);
      assert.equal(definitions.size, 0);
      pureRuntime.registerGlowTourElements();
      assert.deepEqual([...definitions.keys()], pureRuntime.GLOW_TOUR_ELEMENT_NAMES);
    } finally {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: originalHTMLElement },
        customElements: { configurable: true, value: originalCustomElements },
      });
    }
  });

  test("memoizes registrations and rejects incompatible constructors", async () => {
    const originalHTMLElement = globalThis.HTMLElement;
    const originalCustomElements = globalThis.customElements;
    const definitions = new Map<string, CustomElementConstructor>();
    class FakeHTMLElement {}
    const registry = {
      define(name: string, elementConstructor: CustomElementConstructor) {
        definitions.set(name, elementConstructor);
      },
      get(name: string) {
        return definitions.get(name);
      },
    } as unknown as CustomElementRegistry;
    try {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: FakeHTMLElement },
        customElements: { configurable: true, value: registry },
      });
      const pureRuntime = await import(`./index?registry=${Date.now()}`);
      pureRuntime.registerGlowTourElements();
      assert.ok(definitions.get("glow-tour-default"));
      const rootConstructor = definitions.get("glow-tour-root");
      pureRuntime.registerGlowTourElements();
      assert.equal(definitions.get("glow-tour-root"), rootConstructor);
      definitions.set("glow-tour-root", class {} as CustomElementConstructor);
      assert.throws(() => pureRuntime.registerGlowTourElements(), /incompatible constructor/);
    } finally {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: originalHTMLElement },
        customElements: { configurable: true, value: originalCustomElements },
      });
    }
  });
});
