import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { TourElementStep } from "./base";
import PointerElement from "./pointer";

class TestPointerElement extends PointerElement {
  getStyles(position: DOMRect, step: TourElementStep) {
    return this._getNextStyles(position, step);
  }
}

class MockElement {
  readonly attributes = new Map<string, string>();
  animationCalls = 0;
  readonly animations: Array<{ cancelled: boolean }> = [];
  readonly styles = new Map<string, string>();
  readonly style = {
    getPropertyValue: (name: string) => this.styles.get(name) ?? "",
    removeProperty: (name: string) => this.styles.delete(name),
    setProperty: (name: string, value: string) => this.styles.set(name, value),
  };

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getBoundingClientRect() {
    return rect(0, 0, 20, 10);
  }

  animate() {
    this.animationCalls += 1;
    const animation = { cancelled: false };
    this.animations.push(animation);
    return { cancel: () => (animation.cancelled = true), finished: Promise.resolve() };
  }
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { devicePixelRatio: 1, innerHeight: 600, innerWidth: 800 },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

function createStep(placement: "top" | "bottom" | "left" | "right", gap?: number) {
  return {
    indicator: { gap, placementTryOrder: [placement] },
  } satisfies TourElementStep;
}

describe("PointerElement", () => {
  test("uses the configured gap on every placement", () => {
    const target = rect(100, 100, 40, 20);
    const expected = {
      bottom: { left: "110px", top: "144px" },
      left: { left: "56px", top: "105px" },
      right: { left: "164px", top: "105px" },
      top: { left: "110px", top: "66px" },
    } as const;

    for (const placement of ["top", "bottom", "left", "right"] as const) {
      const element = new MockElement();
      const pointer = new TestPointerElement(element as unknown as HTMLElement);

      const styles = pointer.getStyles(target, createStep(placement, 24));

      assert.equal(styles.left, expected[placement].left);
      assert.equal(styles.top, expected[placement].top);
    }
  });

  test("defaults to 16px and clamps negative gaps to zero", () => {
    const target = rect(100, 100, 40, 20);
    const defaultPointer = new TestPointerElement(
      new MockElement() as unknown as HTMLElement,
    );
    const zeroPointer = new TestPointerElement(new MockElement() as unknown as HTMLElement);

    assert.equal(defaultPointer.getStyles(target, createStep("bottom")).top, "136px");
    assert.equal(zeroPointer.getStyles(target, createStep("bottom", -10)).top, "120px");
  });

  test("does not invoke Web Animations and applies the visible final state when duration is zero", async () => {
    const element = new MockElement();
    const pointer = new PointerElement(element as unknown as HTMLElement);
    pointer.setAnimationOptions({ duration: 0 });

    await pointer.moveToTarget(rect(100, 100, 40, 20), createStep("bottom"), true);

    assert.equal(element.animationCalls, 0);
    assert.equal(element.styles.get("opacity"), "1");
    assert.equal(element.attributes.has("aria-hidden"), false);
    assert.equal(element.attributes.get("data-glow-tour-placement"), "bottom");
  });

  test("applies the hidden final state when Web Animations are unavailable", async () => {
    const element = new MockElement();
    const pointer = new PointerElement(element as unknown as HTMLElement);

    await pointer.moveToTarget(rect(100, 100, 40, 20), createStep("bottom"), true);
    (element as { animate?: unknown }).animate = undefined;
    await pointer.disappear();

    assert.equal(element.styles.get("opacity"), "0");
    assert.equal(element.attributes.get("aria-hidden"), "true");
    assert.equal(element.attributes.has("data-glow-tour-placement"), false);
  });

  test("cancels the continuous pointer animation when its owner is invalidated", async () => {
    const element = new MockElement();
    const pointer = new PointerElement(element as unknown as HTMLElement);

    await pointer.moveToTarget(rect(100, 100, 40, 20), createStep("bottom"), true);
    pointer.cancelAnimations();

    assert.equal(element.animations.at(-1)?.cancelled, true);
  });
});
