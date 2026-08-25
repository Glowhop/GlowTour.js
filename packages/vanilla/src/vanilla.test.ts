import { describe, test } from "bun:test";
import assert from "node:assert/strict";
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
    class MockElement {
      readonly attributes = new Map<string, string>();
      childNodes: unknown[] = [];
      readonly style = {
        removeProperty() {},
        setProperty() {},
      };

      append(...nodes: unknown[]) {
        this.childNodes.push(...nodes);
      }

      appendChild(node: unknown) {
        this.childNodes.push(node);
        return node;
      }

      replaceChildren(...nodes: unknown[]) {
        this.childNodes = nodes;
      }

      querySelector(selector: string) {
        if (selector !== ":scope > [data-glow-tour-pointer-content]") return null;
        return (
          this.childNodes.find(
            (node) =>
              node instanceof MockElement && node.attributes.has("data-glow-tour-pointer-content"),
          ) ?? null
        );
      }

      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      }
    }

    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      value: MockElement,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: () => new MockElement(),
      },
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

    const PointerElement = definitions.get(
      "glow-tour-pointer",
    ) as unknown as new () => MockElement & {
      connectedCallback: () => void;
    };
    const pointer = new PointerElement();
    pointer.childNodes.push("☝️");
    pointer.connectedCallback();

    assert.equal(pointer.childNodes.length, 1);
    const content = pointer.childNodes[0];
    assert.ok(content instanceof MockElement);
    assert.equal(content.attributes.has("data-glow-tour-pointer-content"), true);
    assert.deepEqual(content.childNodes, ["☝️"]);
  });
});
