import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import * as runtime from "./index";

describe("vanilla adapter public contract", () => {
  test("exports the Vanilla tour factories and intentional element metadata", () => {
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.createDefaultTourElement, "function");
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
      "glow-tour-back-trigger",
      "glow-tour-advance-trigger",
      "glow-tour-cancel-trigger",
      "glow-tour-overlay",
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
    } finally {
      Object.defineProperties(globalThis, {
        HTMLElement: { configurable: true, value: originalHTMLElement },
        customElements: { configurable: true, value: originalCustomElements },
        document: { configurable: true, value: originalDocument },
      });
    }
  });
});
