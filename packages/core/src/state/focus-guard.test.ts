import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "bun:test";
import { FocusGuard } from "./focus-guard";

class MockNode {
  parent: MockElement | null = null;
}

class MockElement extends MockNode {
  disabled = false;
  hidden = false;
  isConnected = true;
  readonly attributes = new Map<string, string>();
  readonly children: MockElement[] = [];

  constructor(readonly name: string) {
    super();
  }

  append(...children: MockElement[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  closest(selector: string): MockElement | null {
    const isMatch =
      (selector.includes("[hidden]") && this.attributes.has("hidden")) ||
      (selector.includes("[inert]") && this.attributes.has("inert")) ||
      (selector.includes("[aria-hidden='true']") && this.attributes.get("aria-hidden") === "true");
    return isMatch ? this : (this.parent?.closest(selector) ?? null);
  }

  contains(node: MockNode): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }

  focus() {
    mockDocument.activeElement = this;
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  matches(selector: string) {
    if (selector === "[data-glow-tour-next-trigger]") {
      return this.attributes.has("data-glow-tour-next-trigger");
    }
    if (selector === "[data-glow-tour-back-trigger]") {
      return this.attributes.has("data-glow-tour-back-trigger");
    }
    return false;
  }

  querySelectorAll(): MockElement[] {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
  }
}

const mockDocument = {
  activeElement: null as MockElement | null,
  addEventListener() {},
  removeEventListener() {},
};

const originalDocument = globalThis.document;
const originalHTMLElement = globalThis.HTMLElement;
const originalNode = globalThis.Node;
const originalWindow = globalThis.window;

beforeEach(() => {
  mockDocument.activeElement = null;
  Object.defineProperty(globalThis, "document", { configurable: true, value: mockDocument });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: MockElement });
  Object.defineProperty(globalThis, "Node", { configurable: true, value: MockNode });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      getComputedStyle: (element: MockElement) => ({
        display: element.hidden ? "none" : "block",
        visibility: "visible",
      }),
    },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: originalHTMLElement,
  });
  Object.defineProperty(globalThis, "Node", { configurable: true, value: originalNode });
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

function createScope() {
  const popover = new MockElement("popover");
  const backHost = new MockElement("back-host");
  const back = new MockElement("back");
  back.attributes.set("data-glow-tour-back-trigger", "");
  backHost.append(back);
  const nextHost = new MockElement("next-host");
  const next = new MockElement("next");
  next.attributes.set("data-glow-tour-next-trigger", "");
  nextHost.append(next);
  const contentLink = new MockElement("content-link");
  popover.append(backHost, nextHost, contentLink);
  return { back, backHost, contentLink, next, nextHost, popover };
}

describe("FocusGuard", () => {
  test("focuses next when entering a step in the next direction", () => {
    const guard = new FocusGuard();
    const { next, popover } = createScope();

    guard.activate({ direction: "next", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, next);
  });

  test("focuses back when entering a step in the back direction", () => {
    const guard = new FocusGuard();
    const { back, popover } = createScope();

    guard.activate({ direction: "back", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, back);
  });

  test("falls back to the other trigger and then the popover", () => {
    const guard = new FocusGuard();
    const { back, next, popover } = createScope();
    next.attributes.set("disabled", "");

    guard.activate({ direction: "next", popover: popover as unknown as HTMLElement });
    assert.equal(mockDocument.activeElement, back);

    guard.deactivate();
    back.attributes.set("hidden", "");
    back.hidden = true;
    mockDocument.activeElement = null;
    guard.activate({ direction: "next", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("ignores a trigger inside a hidden host", () => {
    const guard = new FocusGuard();
    const { back, nextHost, popover } = createScope();
    nextHost.attributes.set("hidden", "");

    guard.activate({ direction: "next", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, back);
  });

  test("falls back from an unavailable back trigger to next", () => {
    const guard = new FocusGuard();
    const { backHost, next, popover } = createScope();
    backHost.attributes.set("hidden", "");

    guard.activate({ direction: "back", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, next);
  });

  test("restores the initially focused element when deactivated", () => {
    const initialFocus = new MockElement("initial-focus");
    mockDocument.activeElement = initialFocus;
    const guard = new FocusGuard();
    const { popover } = createScope();
    guard.activate({ direction: "next", popover: popover as unknown as HTMLElement });

    guard.deactivate();

    assert.equal(mockDocument.activeElement, initialFocus);
  });
});
