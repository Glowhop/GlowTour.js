import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { WorkflowStep } from "../engine/workflow-step";
import type { TryOrderOptions } from "../types";
import PopoverElement from "./popover";

class TestPopoverElement<T> extends PopoverElement<T> {
  getStyles(position: DOMRect, step: WorkflowStep<T>) {
    return this._getNextStyles(position, step);
  }
}

class MockElement {
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly style = {
    get transform() {
      return "";
    },
    removeProperty: (name: string) => this.styles.delete(name),
    setProperty: (name: string, value: string) => this.styles.set(name, value),
  };

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  toggleAttribute(name: string, force?: boolean) {
    if (force === false) this.attributes.delete(name);
    else this.attributes.set(name, "");
    return force ?? true;
  }

  getBoundingClientRect() {
    return rect(0, 0, this.width, this.height);
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

function createStep(
  placementTryOrder: TryOrderOptions[],
  options: { disableArrow?: boolean; gap?: number } = {},
) {
  return new WorkflowStep<string>({
    popover: { ...options, placementTryOrder },
    props: { content: "content", title: "title" },
    target: "#target",
  });
}

const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { devicePixelRatio: 1, innerHeight: 200, innerWidth: 300 },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("PopoverElement positioning", () => {
  test("centers all placements on the target before viewport adjustment", () => {
    const popover = new PopoverElement<string>(new MockElement(100, 60) as unknown as HTMLElement);
    const target = rect(140, 90, 20, 20);
    const expected = {
      bottom: { arrowOffset: 50, x: 100, y: 124 },
      left: { arrowOffset: 30, x: 26, y: 70 },
      right: { arrowOffset: 30, x: 174, y: 70 },
      top: { arrowOffset: 50, x: 100, y: 16 },
    } as const;

    for (const placement of ["top", "bottom", "left", "right"] as const) {
      assert.deepEqual(popover.resolvePosition(target, createStep([placement])), {
        ...expected[placement],
        placement,
      });
    }
  });

  test("clamps top and bottom candidates against both horizontal viewport edges", () => {
    const popover = new PopoverElement<string>(new MockElement(100, 60) as unknown as HTMLElement);

    assert.deepEqual(popover.resolvePosition(rect(20, 80, 20, 20), createStep(["bottom"])), {
      arrowOffset: 16,
      placement: "bottom",
      x: 14,
      y: 114,
    });
    assert.deepEqual(popover.resolvePosition(rect(260, 100, 20, 20), createStep(["top"])), {
      arrowOffset: 84,
      placement: "top",
      x: 186,
      y: 26,
    });
  });

  test("clamps left and right candidates against both vertical viewport edges", () => {
    const popover = new PopoverElement<string>(new MockElement(100, 60) as unknown as HTMLElement);

    assert.deepEqual(popover.resolvePosition(rect(140, 20, 20, 20), createStep(["right"])), {
      arrowOffset: 16,
      placement: "right",
      x: 174,
      y: 14,
    });
    assert.deepEqual(popover.resolvePosition(rect(140, 160, 20, 20), createStep(["left"])), {
      arrowOffset: 44,
      placement: "left",
      x: 26,
      y: 126,
    });
  });

  test("rejects a candidate whose arrow would overlap a corner", () => {
    const popover = new PopoverElement<string>(new MockElement(100, 60) as unknown as HTMLElement);
    const target = rect(270, 80, 20, 20);

    assert.deepEqual(popover.resolvePosition(target, createStep(["bottom", "left"])), {
      arrowOffset: 30,
      placement: "left",
      x: 156,
      y: 60,
    });
  });

  test("accepts a clamped candidate without an arrow when disableArrow is true", () => {
    const popover = new PopoverElement<string>(new MockElement(100, 60) as unknown as HTMLElement);

    assert.deepEqual(
      popover.resolvePosition(
        rect(270, 80, 20, 20),
        createStep(["bottom"], { disableArrow: true }),
      ),
      { arrowOffset: null, placement: "bottom", x: 186, y: 114 },
    );
  });

  test("falls back to a centered popover without an arrow", () => {
    const popover = new PopoverElement<string>(new MockElement(400, 250) as unknown as HTMLElement);

    assert.deepEqual(popover.resolvePosition(rect(140, 80, 20, 20), createStep(["bottom"])), {
      arrowOffset: null,
      placement: "center",
      x: -50,
      y: -25,
    });
  });

  test("publishes placement, arrow offset and hidden state with the transform", () => {
    const element = new MockElement(100, 60);
    const popover = new TestPopoverElement<string>(element as unknown as HTMLElement);

    const styles = popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"]));

    assert.equal(styles.transform, "translate(14px, 114px)");
    assert.equal(element.attributes.get("data-glow-tour-placement"), "bottom");
    assert.equal(element.attributes.has("data-glow-tour-arrow-hidden"), false);
    assert.equal(element.styles.get("--glow-tour-arrow-offset"), "16px");

    popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"], { disableArrow: true }));
    assert.equal(element.attributes.has("data-glow-tour-arrow-hidden"), true);
    assert.equal(element.styles.has("--glow-tour-arrow-offset"), false);
  });
});
