import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
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
  const positionCases = [
    {
      expected: { arrowOffset: 50, placement: "bottom", x: 100, y: 114 },
      name: "bottom without horizontal overflow",
      target: rect(140, 80, 20, 20),
    },
    {
      expected: { arrowOffset: 16, placement: "bottom", x: 14, y: 114 },
      name: "bottom with left overflow",
      target: rect(20, 80, 20, 20),
    },
    {
      expected: { arrowOffset: 84, placement: "bottom", x: 186, y: 114 },
      name: "bottom with right overflow",
      target: rect(260, 80, 20, 20),
    },
    {
      expected: { arrowOffset: 50, placement: "top", x: 100, y: 26 },
      name: "top without horizontal overflow",
      target: rect(140, 100, 20, 20),
    },
    {
      expected: { arrowOffset: 16, placement: "top", x: 14, y: 26 },
      name: "top with left overflow",
      target: rect(20, 100, 20, 20),
    },
    {
      expected: { arrowOffset: 84, placement: "top", x: 186, y: 26 },
      name: "top with right overflow",
      target: rect(260, 100, 20, 20),
    },
    {
      expected: { arrowOffset: 30, placement: "right", x: 174, y: 60 },
      name: "right without vertical overflow",
      target: rect(140, 80, 20, 20),
    },
    {
      expected: { arrowOffset: 16, placement: "right", x: 174, y: 14 },
      name: "right with top overflow",
      target: rect(140, 20, 20, 20),
    },
    {
      expected: { arrowOffset: 44, placement: "right", x: 174, y: 126 },
      name: "right with bottom overflow",
      target: rect(140, 160, 20, 20),
    },
    {
      expected: { arrowOffset: 30, placement: "left", x: 26, y: 60 },
      name: "left without vertical overflow",
      target: rect(140, 80, 20, 20),
    },
    {
      expected: { arrowOffset: 16, placement: "left", x: 26, y: 14 },
      name: "left with top overflow",
      target: rect(140, 20, 20, 20),
    },
    {
      expected: { arrowOffset: 44, placement: "left", x: 26, y: 126 },
      name: "left with bottom overflow",
      target: rect(140, 160, 20, 20),
    },
  ] as const;

  for (const scenario of positionCases) {
    test(`positions ${scenario.name} and keeps the arrow anchored`, () => {
      const popover = new PopoverElement<string>(
        new MockElement(100, 60) as unknown as HTMLElement,
      );

      const position = popover.resolvePosition(
        scenario.target,
        createStep([scenario.expected.placement]),
      );

      assert.deepEqual(position, scenario.expected);
      assert.ok(position.x >= 14);
      assert.ok(position.y >= 14);
      assert.ok(position.x + 100 <= 300 - 14);
      assert.ok(position.y + 60 <= 200 - 14);

      const targetAnchor =
        position.placement === "top" || position.placement === "bottom"
          ? scenario.target.left + scenario.target.width / 2
          : scenario.target.top + scenario.target.height / 2;
      const arrowAnchor =
        position.placement === "top" || position.placement === "bottom"
          ? position.x + (position.arrowOffset ?? 0)
          : position.y + (position.arrowOffset ?? 0);
      assert.equal(arrowAnchor, targetAnchor);
    });
  }

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
