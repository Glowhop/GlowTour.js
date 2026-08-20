import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { WorkflowStep } from "../engine/workflow-step";
import PointerElement from "./pointer";

class TestPointerElement<T> extends PointerElement<T> {
  getStyles(position: DOMRect, step: WorkflowStep<T>) {
    return this._getNextStyles(position, step);
  }
}

class MockElement {
  readonly attributes = new Map<string, string>();
  animationCalls = 0;
  readonly animations: Array<{ cancelled: boolean }> = [];
  readonly style = {
    removeProperty() {},
    setProperty() {},
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
  return new WorkflowStep<string>({
    indicator: { gap, placementTryOrder: [placement] },
    props: { content: "content", title: "title" },
    target: "#target",
  });
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
      const pointer = new TestPointerElement<string>(element as unknown as HTMLElement);

      const styles = pointer.getStyles(target, createStep(placement, 24));

      assert.equal(styles.left, expected[placement].left);
      assert.equal(styles.top, expected[placement].top);
    }
  });

  test("defaults to 16px and clamps negative gaps to zero", () => {
    const target = rect(100, 100, 40, 20);
    const defaultPointer = new TestPointerElement<string>(
      new MockElement() as unknown as HTMLElement,
    );
    const zeroPointer = new TestPointerElement<string>(new MockElement() as unknown as HTMLElement);

    assert.equal(defaultPointer.getStyles(target, createStep("bottom")).top, "136px");
    assert.equal(zeroPointer.getStyles(target, createStep("bottom", -10)).top, "120px");
  });

  test("does not start a continuous pointer animation when duration is zero", async () => {
    const element = new MockElement();
    const pointer = new PointerElement<string>(element as unknown as HTMLElement);
    pointer.setAnimationOptions({ duration: 0 });

    await pointer.moveToTarget(rect(100, 100, 40, 20), createStep("bottom"), true);

    assert.equal(element.animationCalls, 1);
  });

  test("cancels the continuous pointer animation when its owner is invalidated", async () => {
    const element = new MockElement();
    const pointer = new PointerElement<string>(element as unknown as HTMLElement);

    await pointer.moveToTarget(rect(100, 100, 40, 20), createStep("bottom"), true);
    pointer.cancelAnimations();

    assert.equal(element.animations.at(-1)?.cancelled, true);
  });
});
