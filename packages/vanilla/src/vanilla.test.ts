import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createTourStore,
  GLOW_TOUR_ELEMENT_NAMES,
  glowTour,
  registerGlowTourElements,
} from "./index";

describe("vanilla adapter contract", () => {
  test("exports the shared core API and the Vanilla singleton", () => {
    assert.equal(typeof createTourStore, "function");
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof glowTour.state.get, "function");
  });

  test("declares the complete custom-element surface", () => {
    assert.deepEqual(GLOW_TOUR_ELEMENT_NAMES, [
      "glow-tour-root",
      "glow-tour-header",
      "glow-tour-content",
      "glow-tour-footer",
      "glow-tour-popover",
      "glow-tour-pointer",
      "glow-tour-back-trigger",
      "glow-tour-next-trigger",
      "glow-tour-overlay",
    ]);
  });

  test("registers custom elements idempotently", () => {
    const definitions = new Map<string, CustomElementConstructor>();
    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      value: class {},
    });
    Object.defineProperty(globalThis, "customElements", {
      configurable: true,
      value: {
        define(name: string, elementConstructor: CustomElementConstructor) {
          definitions.set(name, elementConstructor);
        },
        get(name: string) {
          return definitions.get(name);
        },
      },
    });

    registerGlowTourElements();
    registerGlowTourElements();

    assert.deepEqual([...definitions.keys()], [...GLOW_TOUR_ELEMENT_NAMES]);
  });
});
