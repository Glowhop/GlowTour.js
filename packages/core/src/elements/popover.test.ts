import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { PopoverOptions, TryOrderOptions } from "../types";
import type { TourElementStep } from "./base";
import PopoverElement from "./popover";

class TestPopoverElement extends PopoverElement {
  getStyles(position: DOMRect, step: TourElementStep) {
    return this._getNextStyles(position, step);
  }
}

const mockDocument = {
  createElement(name: string) {
    assert.equal(name, "div");
    return {
      style: {
        getPropertyValue: () => "accepted",
        setProperty() {},
      },
    };
  },
};

class MockElement {
  readonly attributes = new Map<string, string>();
  readonly priorities = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly style = {
    get transform() {
      return "";
    },
    getPropertyPriority: (name: string) => this.priorities.get(name) ?? "",
    getPropertyValue: (name: string) => this.styles.get(name) ?? "",
    removeProperty: (name: string) => {
      this.priorities.delete(name);
      return this.styles.delete(name);
    },
    setProperty: (name: string, value: string, priority = "") => {
      this.styles.set(name, value);
      if (priority) this.priorities.set(name, priority);
      else this.priorities.delete(name);
    },
  };

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly root?: MockStyleRoot,
  ) {}

  get ownerDocument() {
    return this.root?.ownerDocument ?? mockDocument;
  }

  getRootNode() {
    return this.root ?? this;
  }

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

  animate() {
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  }
}

class MockStyleElement {
  readonly attributes = new Map<string, string>();
  textContent = "";
  nonce = "";

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class MockStyleRoot {
  readonly styles: MockStyleElement[] = [];
  readonly head = { append: (style: MockStyleElement) => this.styles.push(style) };
  readonly documentElement = this.head;
  readonly ownerDocument: MockStyleRoot;

  constructor(
    readonly nodeType: 9 | 11,
    ownerDocument?: MockStyleRoot,
  ) {
    this.ownerDocument = ownerDocument ?? this;
  }

  append(style: MockStyleElement) {
    this.styles.push(style);
  }

  createElement(name: string) {
    if (name === "div") return mockDocument.createElement(name);
    assert.equal(name, "style");
    return new MockStyleElement();
  }

  querySelector(selector: string) {
    assert.equal(selector, "style[data-glow-tour-core-arrow-styles]");
    return this.styles.find((style) => style.attributes.has("data-glow-tour-core-arrow-styles"));
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
  options: Omit<PopoverOptions, "placementTryOrder"> = {},
) {
  return {
    popover: { ...options, placementTryOrder },
  } satisfies TourElementStep;
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
      const popover = new PopoverElement(
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
    const popover = new PopoverElement(new MockElement(100, 60) as unknown as HTMLElement);
    const target = rect(270, 80, 20, 20);

    assert.deepEqual(popover.resolvePosition(target, createStep(["bottom", "left"])), {
      arrowOffset: 30,
      placement: "left",
      x: 156,
      y: 60,
    });
  });

  test("accepts a clamped candidate without an arrow when arrow.disabled is true", () => {
    const popover = new PopoverElement(new MockElement(100, 60) as unknown as HTMLElement);

    assert.deepEqual(
      popover.resolvePosition(
        rect(270, 80, 20, 20),
        createStep(["bottom"], { arrow: { disabled: true } }),
      ),
      { arrowOffset: null, placement: "bottom", x: 186, y: 114 },
    );
  });

  test("uses arrow.edgePadding when validating a placement near a corner", () => {
    const popover = new PopoverElement(new MockElement(100, 60) as unknown as HTMLElement);

    assert.deepEqual(
      popover.resolvePosition(
        rect(10, 80, 20, 20),
        createStep(["bottom"], { arrow: { edgePadding: 4 } }),
      ),
      { arrowOffset: 6, placement: "bottom", x: 14, y: 114 },
    );
  });

  test("falls back to a centered popover without an arrow", () => {
    const popover = new PopoverElement(new MockElement(400, 250) as unknown as HTMLElement);

    assert.deepEqual(popover.resolvePosition(rect(140, 80, 20, 20), createStep(["bottom"])), {
      arrowOffset: null,
      placement: "center",
      x: -50,
      y: -25,
    });
  });

  test("publishes placement, arrow offset and hidden state with the transform", () => {
    const element = new MockElement(100, 60);
    const popover = new TestPopoverElement(element as unknown as HTMLElement);

    const styles = popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"]));

    assert.equal(styles.transform, "translate(14px, 114px)");
    assert.equal(element.attributes.get("data-glow-tour-placement"), "bottom");
    assert.equal(element.attributes.has("data-glow-tour-arrow-hidden"), false);
    assert.equal(element.styles.get("--glow-tour-arrow-offset"), "16px");

    popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"], { arrow: { disabled: true } }));
    assert.equal(element.attributes.has("data-glow-tour-arrow-hidden"), true);
    assert.equal(element.styles.has("--glow-tour-arrow-offset"), false);
  });

  test("publishes arrow styles and restores consumer variables when overrides disappear", () => {
    const element = new MockElement(100, 60);
    element.style.setProperty("--glow-tour-arrow-color", "var(--consumer-arrow)", "important");
    const popover = new TestPopoverElement(element as unknown as HTMLElement);

    popover.getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"], {
        arrow: {
          borderRadius: 3,
          borderWidth: 2,
          color: "#4c35fd",
          size: 16,
        },
      }),
    );

    assert.equal(element.styles.get("--glow-tour-arrow-color"), "#4c35fd");
    assert.equal(element.styles.get("--glow-tour-arrow-size"), "16px");
    assert.equal(element.styles.get("--glow-tour-arrow-border-width"), "2px");
    assert.equal(element.styles.get("--glow-tour-arrow-border-radius"), "3px");

    popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"]));

    assert.equal(element.styles.get("--glow-tour-arrow-color"), "var(--consumer-arrow)");
    assert.equal(element.priorities.get("--glow-tour-arrow-color"), "important");
    assert.equal(element.styles.has("--glow-tour-arrow-size"), false);
    assert.equal(element.styles.has("--glow-tour-arrow-border-width"), false);
    assert.equal(element.styles.has("--glow-tour-arrow-border-radius"), false);
  });

  test("restores consumer arrow variables on release", () => {
    const element = new MockElement(100, 60);
    element.style.setProperty("--glow-tour-arrow-size", "24px");
    const popover = new TestPopoverElement(element as unknown as HTMLElement);

    popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"], { arrow: { size: 16 } }));
    popover.release();

    assert.equal(element.styles.get("--glow-tour-arrow-size"), "24px");
  });

  test("restores every authored popover mutation when it is released", async () => {
    const element = new MockElement(100, 60);
    const authoredAttributes = new Map([
      ["tabindex", "2"],
      ["aria-hidden", "consumer-hidden"],
      ["inert", "consumer-inert"],
      ["data-glow-tour-placement", "top"],
      ["data-glow-tour-arrow-hidden", ""],
    ]);
    const authoredStyles = new Map([
      ["position", "absolute"],
      ["z-index", "8000"],
      ["top", "24px"],
      ["left", "32px"],
      ["opacity", "0.4"],
      ["transform-origin", "top left"],
      ["transform", "scale(0.9)"],
      ["--glow-tour-arrow-offset", "12px"],
      ["--glow-tour-arrow-color", "var(--consumer-arrow)"],
    ]);
    for (const [name, value] of authoredAttributes) element.setAttribute(name, value);
    for (const [name, value] of authoredStyles) element.style.setProperty(name, value, "important");
    const popover = new PopoverElement(element as unknown as HTMLElement);

    popover.initializeProps();
    await popover.moveToTarget(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { color: "#4c35fd" } }),
      true,
    );
    popover.release();

    for (const [name, value] of authoredAttributes) assert.equal(element.getAttribute(name), value);
    for (const [name, value] of authoredStyles) {
      assert.equal(element.style.getPropertyValue(name), value);
      assert.equal(element.style.getPropertyPriority(name), "important");
    }
  });

  test("preserves consumer popover changes after Core's latest writes", async () => {
    const element = new MockElement(100, 60);
    const popover = new PopoverElement(element as unknown as HTMLElement);

    popover.initializeProps();
    await popover.moveToTarget(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { color: "#4c35fd" } }),
      true,
    );
    element.setAttribute("aria-hidden", "consumer-hidden");
    element.style.setProperty("position", "relative", "important");
    element.style.setProperty("--glow-tour-arrow-color", "var(--later-consumer-arrow)", "important");
    popover.release();

    assert.equal(element.getAttribute("aria-hidden"), "consumer-hidden");
    assert.equal(element.style.getPropertyValue("position"), "relative");
    assert.equal(element.style.getPropertyPriority("position"), "important");
    assert.equal(
      element.style.getPropertyValue("--glow-tour-arrow-color"),
      "var(--later-consumer-arrow)",
    );
    assert.equal(element.style.getPropertyPriority("--glow-tour-arrow-color"), "important");
  });

  test("removes initially absent Core-owned popover properties on release", async () => {
    const element = new MockElement(100, 60);
    const popover = new PopoverElement(element as unknown as HTMLElement);

    popover.initializeProps();
    await popover.moveToTarget(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { color: "#4c35fd" } }),
      true,
    );
    popover.release();

    for (const name of [
      "tabindex",
      "aria-hidden",
      "inert",
      "data-glow-tour-placement",
      "data-glow-tour-arrow-hidden",
    ]) {
      assert.equal(element.getAttribute(name), null);
    }
    for (const name of [
      "position",
      "z-index",
      "top",
      "left",
      "opacity",
      "transform-origin",
      "transform",
      "--glow-tour-arrow-offset",
      "--glow-tour-arrow-color",
    ]) {
      assert.equal(element.style.getPropertyValue(name), "");
      assert.equal(element.style.getPropertyPriority(name), "");
    }
  });

  test("preserves a later consumer arrow variable when an override disappears", () => {
    const element = new MockElement(100, 60);
    element.style.setProperty("--glow-tour-arrow-color", "var(--consumer-arrow)");
    const popover = new TestPopoverElement(element as unknown as HTMLElement);

    popover.getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { color: "#4c35fd" } }),
    );
    element.style.setProperty("--glow-tour-arrow-color", "var(--later-consumer-arrow)", "important");
    popover.getStyles(rect(20, 80, 20, 20), createStep(["bottom"]));

    assert.equal(
      element.style.getPropertyValue("--glow-tour-arrow-color"),
      "var(--later-consumer-arrow)",
    );
    assert.equal(element.style.getPropertyPriority("--glow-tour-arrow-color"), "important");
  });
});

describe("PopoverElement arrow stylesheet", () => {
  test("injects the structural pseudo-element rules once per document", () => {
    const document = new MockStyleRoot(9);
    const firstElement = new MockElement(100, 60, document);
    const secondElement = new MockElement(100, 60, document);

    new TestPopoverElement(firstElement as unknown as HTMLElement).getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"]),
    );
    new TestPopoverElement(secondElement as unknown as HTMLElement).getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"]),
    );

    assert.equal(document.styles.length, 1);
    assert.match(
      document.styles[0]?.textContent ?? "",
      /:where\(\[data-glow-tour-popover\]\)::before/,
    );
    assert.match(document.styles[0]?.textContent ?? "", /--glow-tour-arrow-color/);
    assert.match(document.styles[0]?.textContent ?? "", /--glow-tour-color-surface/);
  });

  test("injects the structural rules inside a shadow root", () => {
    const document = new MockStyleRoot(9);
    const root = new MockStyleRoot(11, document);
    const element = new MockElement(100, 60, root);

    new TestPopoverElement(element as unknown as HTMLElement).getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"]),
    );

    assert.equal(root.styles.length, 1);
  });

  test("applies a CSP nonce to the injected style element", () => {
    const document = new MockStyleRoot(9);
    const element = new MockElement(100, 60, document);

    new TestPopoverElement(element as unknown as HTMLElement).getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { styleNonce: "csp-nonce-123" } }),
    );

    assert.equal(document.styles.length, 1);
    assert.equal(document.styles[0]?.nonce, "csp-nonce-123");
  });

  test("skips injection when disableAutoStyles is set", () => {
    const document = new MockStyleRoot(9);
    const element = new MockElement(100, 60, document);

    new TestPopoverElement(element as unknown as HTMLElement).getStyles(
      rect(20, 80, 20, 20),
      createStep(["bottom"], { arrow: { disableAutoStyles: true } }),
    );

    assert.equal(document.styles.length, 0);
  });
});

describe("PopoverElement animation fallbacks", () => {
  test("applies the visible final state when Web Animations are unavailable", async () => {
    const element = new MockElement(100, 60);
    const popover = new PopoverElement(element as unknown as HTMLElement);
    element.removeAttribute("animate");
    (element as { animate?: unknown }).animate = undefined;

    await popover.moveToTarget(rect(20, 80, 20, 20), createStep(["bottom"]), true);

    assert.equal(element.styles.get("transform"), "translate(14px, 114px)");
    assert.equal(element.styles.get("opacity"), "1");
    assert.equal(element.attributes.has("aria-hidden"), false);
    assert.equal(element.attributes.has("inert"), false);
  });

  test("applies the hidden final state when animation creation throws", async () => {
    const element = new MockElement(100, 60);
    const popover = new PopoverElement(element as unknown as HTMLElement);
    element.style.setProperty("transform", "translate(14px, 114px)");
    element.animate = () => {
      throw new Error("unsupported animation");
    };

    await popover.disappear();

    assert.equal(element.styles.get("opacity"), "0");
    assert.equal(element.attributes.get("aria-hidden"), "true");
    assert.equal(element.attributes.get("inert"), "true");
    assert.equal(element.styles.has("transform"), false);
  });
});
