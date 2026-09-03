import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { FocusGuard } from "./focus-guard";
import { isFocusable } from "./focusable";

class MockNode {
  parent: MockElement | null = null;
}

class MockElement extends MockNode {
  disabled = false;
  display = "block";
  hidden = false;
  isConnected = true;
  visibility = "visible";
  readonly attributes = new Map<string, string>();
  readonly children: MockElement[] = [];

  constructor(readonly name: string) {
    super();
  }

  get parentElement() {
    return this.parent;
  }

  append(...children: MockElement[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  closest(selector: string): MockElement | null {
    if (selector.includes("data-glow-tour-root") && this.attributes.has("data-glow-tour-root")) {
      return this;
    }
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
    mockDocument.dispatchFocusIn(this);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  matches(selector: string) {
    const triggerAttributes = [
      "data-glow-tour-previous-trigger",
      "data-glow-tour-cancel-trigger",
      "data-glow-tour-advance-trigger",
    ];
    if (triggerAttributes.some((attribute) => selector.includes(attribute))) {
      return triggerAttributes.some(
        (attribute) => selector.includes(attribute) && this.attributes.has(attribute),
      );
    }
    return (
      (selector.includes("button") &&
        ["back", "custom-button", "advance", "target-button"].includes(this.name)) ||
      (selector.includes("summary") && this.name === "summary") ||
      (selector.includes("audio") && this.name === "audio") ||
      (selector.includes("video") && this.name === "video")
    );
  }

  querySelectorAll(selector = ""): MockElement[] {
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
    return selector ? descendants.filter((child) => child.matches(selector)) : descendants;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

const mockDocument = {
  activeElement: null as MockElement | null,
  focusInListeners: new Set<(event: FocusEvent) => void>(),
  addEventListener(type: string, listener: (event: FocusEvent) => void) {
    if (type === "focusin") this.focusInListeners.add(listener);
  },
  dispatchFocusIn(target: MockElement) {
    for (const listener of this.focusInListeners) {
      listener({ target } as unknown as FocusEvent);
    }
  },
  removeEventListener(type: string, listener: (event: FocusEvent) => void) {
    if (type === "focusin") this.focusInListeners.delete(listener);
  },
};

const originalDocument = globalThis.document;
const originalHTMLElement = globalThis.HTMLElement;
const originalNode = globalThis.Node;
const originalWindow = globalThis.window;

beforeEach(() => {
  mockDocument.activeElement = null;
  mockDocument.focusInListeners.clear();
  Object.defineProperty(globalThis, "document", { configurable: true, value: mockDocument });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: MockElement });
  Object.defineProperty(globalThis, "Node", { configurable: true, value: MockNode });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      getComputedStyle: (element: MockElement) => ({
        display: element.hidden ? "none" : element.display,
        visibility: element.visibility,
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
  const root = new MockElement("root");
  root.attributes.set("data-glow-tour-root", "");
  const popover = new MockElement("popover");
  const backHost = new MockElement("back-host");
  const back = new MockElement("back");
  back.attributes.set("data-glow-tour-previous-trigger", "");
  backHost.append(back);
  const advanceHost = new MockElement("advance-host");
  const advance = new MockElement("advance");
  advance.attributes.set("data-glow-tour-advance-trigger", "");
  advanceHost.append(advance);
  const contentLink = new MockElement("custom-button");
  popover.append(backHost, advanceHost, contentLink);
  root.append(popover);
  return { back, backHost, contentLink, advance, advanceHost, popover, root };
}

describe("FocusGuard", () => {
  test("treats an owner realm without computed styles as not focusable", () => {
    const element = new MockElement("advance");
    Object.defineProperty(element, "ownerDocument", {
      configurable: true,
      value: { defaultView: {} },
    });

    assert.equal(isFocusable(element as unknown as HTMLElement), false);
  });

  test("does not use a global style API when the owner window is unavailable", () => {
    const element = new MockElement("advance");
    Object.defineProperty(element, "ownerDocument", {
      configurable: true,
      value: { defaultView: null },
    });

    assert.equal(isFocusable(element as unknown as HTMLElement), false);
  });

  test("focuses advance when entering a step in the advance direction", () => {
    const guard = new FocusGuard();
    const { advance, popover } = createScope();

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, advance);
  });

  test("does not focus another control when advance is unavailable", () => {
    const guard = new FocusGuard();
    const { advance, popover } = createScope();
    advance.attributes.set("disabled", "");

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("keeps neutral fallback focus inside the popover dialog", () => {
    const guard = new FocusGuard();
    const fallback = new MockElement("fallback");
    const { advance, popover } = createScope();
    advance.attributes.set("disabled", "");

    guard.activate({
      direction: "advance",
      fallback: fallback as unknown as HTMLElement,
      popover: popover as unknown as HTMLElement,
    });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("focuses the previous trigger when entering in the previous direction", () => {
    const guard = new FocusGuard();
    const { back, popover } = createScope();

    guard.activate({ direction: "previous", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, back);
  });

  test("does not fall back to another trigger or rich popover content", () => {
    const guard = new FocusGuard();
    const { back, advance, popover } = createScope();
    advance.attributes.set("disabled", "");

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });
    assert.equal(mockDocument.activeElement, popover);

    guard.deactivate();
    back.attributes.set("hidden", "");
    back.hidden = true;
    mockDocument.activeElement = null;
    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("ignores a trigger inside a hidden host", () => {
    const guard = new FocusGuard();
    const { advanceHost, popover } = createScope();
    advanceHost.attributes.set("hidden", "");

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("does not fall back from an unavailable previous trigger to advance", () => {
    const guard = new FocusGuard();
    const { backHost, popover } = createScope();
    backHost.attributes.set("hidden", "");

    guard.activate({ direction: "previous", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("restores the initially focused element when deactivated", () => {
    const initialFocus = new MockElement("initial-focus");
    mockDocument.activeElement = initialFocus;
    const guard = new FocusGuard();
    const { popover } = createScope();
    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    guard.deactivate();

    assert.equal(mockDocument.activeElement, initialFocus);
  });

  test("does not fall back to rich controls when directional controls are unavailable", () => {
    const guard = new FocusGuard();
    const { backHost, contentLink, advanceHost, popover } = createScope();
    const hiddenHost = new MockElement("hidden-host");
    const hiddenSummary = new MockElement("summary");
    const audio = new MockElement("audio");
    backHost.attributes.set("hidden", "");
    advanceHost.attributes.set("hidden", "");
    contentLink.attributes.set("hidden", "");
    contentLink.hidden = true;
    hiddenHost.visibility = "hidden";
    hiddenHost.append(hiddenSummary);
    audio.attributes.set("controls", "");
    popover.append(hiddenHost, audio);

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });

    assert.equal(mockDocument.activeElement, popover);
  });

  test("allows rich popover controls and redirects external elements", () => {
    const guard = new FocusGuard();
    const { advance, popover } = createScope();
    const customButton = new MockElement("custom-button");
    const launcher = new MockElement("custom-button");
    popover.append(customButton);

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });
    customButton.focus();
    assert.equal(mockDocument.activeElement, customButton);

    launcher.focus();
    assert.equal(mockDocument.activeElement, advance);
  });

  test("rejects controls owned by a nested tour root", () => {
    const guard = new FocusGuard();
    const { advance, popover } = createScope();
    const nestedRoot = new MockElement("nested-root");
    const nestedButton = new MockElement("custom-button");
    nestedRoot.attributes.set("data-glow-tour-root", "");
    nestedRoot.append(nestedButton);
    popover.append(nestedRoot);

    guard.activate({ direction: "advance", popover: popover as unknown as HTMLElement });
    nestedButton.focus();

    assert.equal(mockDocument.activeElement, advance);
  });

  test("allows only the current target subtree when interaction is enabled", () => {
    const guard = new FocusGuard();
    const { advance, popover } = createScope();
    const firstTarget = new MockElement("target");
    const firstButton = new MockElement("target-button");
    const secondTarget = new MockElement("target");
    const secondButton = new MockElement("target-button");
    firstTarget.append(firstButton);
    secondTarget.append(secondButton);

    guard.activate({
      allowedTarget: firstTarget as unknown as HTMLElement,
      allowTargetInteraction: true,
      direction: "advance",
      popover: popover as unknown as HTMLElement,
    });
    firstButton.focus();
    assert.equal(mockDocument.activeElement, firstButton);

    guard.update({
      allowedTarget: secondTarget as unknown as HTMLElement,
      allowTargetInteraction: true,
      direction: "advance",
      popover: popover as unknown as HTMLElement,
    });
    firstButton.focus();
    assert.equal(mockDocument.activeElement, advance);
    secondButton.focus();
    assert.equal(mockDocument.activeElement, secondButton);
  });

  test("enforces the focus scope when automatic directional focus is disabled", () => {
    const launcher = new MockElement("custom-button");
    mockDocument.activeElement = launcher;
    const guard = new FocusGuard();
    const { advance, popover } = createScope();

    guard.activate({
      autoFocus: false,
      direction: "advance",
      popover: popover as unknown as HTMLElement,
    });

    assert.equal(mockDocument.activeElement, advance);
  });

  test("restores an authored fallback tabindex when deactivated", () => {
    const fallback = new MockElement("fallback");
    fallback.attributes.set("tabindex", "0");
    const guard = new FocusGuard();
    const { popover } = createScope();

    guard.activate({
      direction: "advance",
      fallback: fallback as unknown as HTMLElement,
      popover: popover as unknown as HTMLElement,
    });
    assert.equal(fallback.getAttribute("tabindex"), "-1");

    guard.deactivate();
    assert.equal(fallback.getAttribute("tabindex"), "0");
  });

  test("preserves a consumer fallback tabindex change when deactivated", () => {
    const fallback = new MockElement("fallback");
    const guard = new FocusGuard();
    const { popover } = createScope();

    guard.activate({
      direction: "advance",
      fallback: fallback as unknown as HTMLElement,
      popover: popover as unknown as HTMLElement,
    });
    assert.equal(fallback.getAttribute("tabindex"), "-1");

    fallback.setAttribute("tabindex", "0");
    guard.deactivate();
    assert.equal(fallback.getAttribute("tabindex"), "0");
  });
});
