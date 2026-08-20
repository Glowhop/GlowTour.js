import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { create } from "../builder";
import { ActiveStep } from "../runtime/active-step";
import { DomTourViewDriver, type TourViewCommands } from "./tour-view-driver";

type Listener = (event: MockEvent) => void;
type Rect = { left: number; top: number; width: number; height: number };

class MockEvent {
  defaultPrevented = false;
  target: MockNode | null = null;
  constructor(
    readonly type: string,
    init: Partial<MockEvent> = {},
  ) {
    Object.assign(this, init);
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}
class MockKeyboardEvent extends MockEvent {
  altKey = false;
  ctrlKey = false;
  isComposing = false;
  key = "";
  metaKey = false;
  shiftKey = false;
  constructor(type: string, init: Partial<MockKeyboardEvent> = {}) {
    super(type);
    Object.assign(this, init);
  }
}
class MockEventTarget {
  readonly listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }
  dispatchEvent(event: MockEvent) {
    event.target ??= this instanceof MockNode ? this : null;
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    return !event.defaultPrevented;
  }
}
class MockNode extends MockEventTarget {
  parent: MockElement | null = null;
}
class MockStyle {
  readonly values = new Map<string, string>();
  get transform() {
    return this.values.get("transform") ?? "";
  }
  removeProperty(name: string) {
    this.values.delete(name);
  }
  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }
}
class MockElement extends MockNode {
  readonly attributes = new Map<string, string>();
  readonly children: MockElement[] = [];
  readonly style = new MockStyle();
  isConnected = true;
  private rect: Rect = { height: 0, left: 0, top: 0, width: 0 };
  constructor(readonly tagName: string) {
    super();
  }
  append(...children: MockElement[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  contains(node: MockNode): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }
  closest(selector: string): MockElement | null {
    const match =
      (selector.includes("[hidden]") && this.hasAttribute("hidden")) ||
      (selector.includes("[inert]") && this.hasAttribute("inert")) ||
      (selector.includes("[aria-hidden='true']") && this.getAttribute("aria-hidden") === "true");
    return match ? this : (this.parent?.closest(selector) ?? null);
  }
  focus() {
    document.activeElement = this;
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  getBoundingClientRect() {
    return {
      ...this.rect,
      bottom: this.rect.top + this.rect.height,
      right: this.rect.left + this.rect.width,
      x: this.rect.left,
      y: this.rect.top,
      toJSON: () => ({}),
    } as DOMRect;
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  matches(selector: string) {
    return selector.includes("next-trigger")
      ? this.hasAttribute("data-glow-tour-next-trigger")
      : selector.includes("back-trigger")
        ? this.hasAttribute("data-glow-tour-back-trigger")
        : selector.includes(this.tagName)
          ? true
          : selector === "path"
            ? this.tagName === "path"
            : false;
  }
  querySelector<T extends MockElement>(selector: string): T | null {
    return this.querySelectorAll<T>().find((element: T) => element.matches(selector)) ?? null;
  }
  querySelectorAll<T extends MockElement>(_selector = ""): T[] {
    return this.children.flatMap((child): MockElement[] => [
      child,
      ...child.querySelectorAll<T>(),
    ]) as T[];
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  replaceChild(replacement: MockElement, previous: MockElement) {
    const index = this.children.indexOf(previous);
    if (index >= 0) {
      previous.parent = null;
      replacement.parent = this;
      this.children.splice(index, 1, replacement);
    }
  }
  scrollIntoView() {}
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  setRect(rect: Rect) {
    this.rect = rect;
  }
  toggleAttribute(name: string, force?: boolean) {
    if (force === false) this.removeAttribute(name);
    else this.setAttribute(name, "");
    return force ?? true;
  }
  animate() {
    return { cancel() {}, commitStyles() {}, finished: Promise.resolve() };
  }
}
class MockDocument extends MockEventTarget {
  activeElement: MockElement | null = null;
  readonly body = new MockElement("body");
  createElement(tagName: string) {
    return new MockElement(tagName);
  }
  createElementNS(_namespace: string, tagName: string) {
    return new MockElement(tagName);
  }
}
class MockWindow extends MockEventTarget {
  devicePixelRatio = 1;
  innerHeight = 800;
  innerWidth = 1200;
  getComputedStyle() {
    return { display: "block", visibility: "visible" };
  }
}
class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }
  disconnect() {
    this.disconnected = true;
  }
  observe() {}
  unobserve() {}
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const globalKeys = [
  "Element",
  "Event",
  "HTMLElement",
  "KeyboardEvent",
  "Node",
  "ResizeObserver",
  "SVGSVGElement",
  "cancelAnimationFrame",
  "document",
  "requestAnimationFrame",
  "window",
] as const;
const originalGlobals = new Map(
  globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
let animationFrames: FrameRequestCallback[];
let cancelledFrames: number[];
let document: MockDocument;
let window: MockWindow;
beforeEach(() => {
  animationFrames = [];
  cancelledFrames = [];
  document = new MockDocument();
  window = new MockWindow();
  TestResizeObserver.instances = [];
  const replacements = {
    Element: MockElement,
    Event: MockEvent,
    HTMLElement: MockElement,
    KeyboardEvent: MockKeyboardEvent,
    Node: MockNode,
    ResizeObserver: TestResizeObserver,
    SVGSVGElement: MockElement,
    cancelAnimationFrame: (id: number) => void cancelledFrames.push(id),
    document,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    },
    window,
  };
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
});
afterEach(() => {
  for (const key of globalKeys) {
    const descriptor = originalGlobals.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function flushFrame() {
  animationFrames.shift()?.(0);
}
function createCommands(): { commands: TourViewCommands; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    commands: {
      advance: async () => void calls.push("advance"),
      cancel: async () => void calls.push("cancel"),
      previous: async () => void calls.push("previous"),
    },
  };
}
function createStep(
  options: { allowInteraction?: boolean; targetTracking?: "events" | "continuous" } = {},
) {
  const workflow = create<string>("dom-driver", {
    behavior: {
      allowInteraction: options.allowInteraction,
      targetTracking: options.targetTracking,
    },
  })
    .step({ content: "content", target: "#target", title: "title" })
    .finish();
  const definition = workflow.steps[0];
  if (!definition) throw new Error("Expected one workflow step");
  return new ActiveStep(definition, workflow.options);
}
function createElements() {
  const root = document.createElement("section"),
    popover = document.createElement("aside"),
    next = document.createElement("button"),
    back = document.createElement("button"),
    pointer = document.createElement("div"),
    overlay = document.createElementNS("svg", "svg");
  next.setAttribute("data-glow-tour-next-trigger", "");
  back.setAttribute("data-glow-tour-back-trigger", "");
  popover.append(back, next);
  overlay.append(document.createElementNS("svg", "path"));
  root.append(popover, pointer, overlay);
  document.body.append(root);
  popover.setRect({ height: 40, left: 0, top: 0, width: 160 });
  pointer.setRect({ height: 10, left: 0, top: 0, width: 10 });
  return { back, next, overlay, pointer, popover, root };
}
function installDriver() {
  const { calls, commands } = createCommands(),
    driver = new DomTourViewDriver<string>(commands),
    elements = createElements();
  driver.registerRoot(elements.root as unknown as HTMLElement);
  driver.registerPopover(elements.popover as unknown as HTMLElement);
  driver.registerOverlay(elements.overlay as unknown as SVGSVGElement);
  driver.registerPointer(elements.pointer as unknown as HTMLElement);
  return { calls, driver, elements };
}
function createTarget() {
  const target = document.createElement("button");
  document.body.append(target);
  target.setRect({ height: 20, left: 10, top: 10, width: 20 });
  return target;
}

describe("DomTourViewDriver", () => {
  test("coalesces resize and capture scroll invalidations into one animation frame", async () => {
    const { driver } = installDriver(),
      step = createStep();
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    TestResizeObserver.instances[0]?.trigger();
    window.dispatchEvent(new MockEvent("resize"));
    window.dispatchEvent(new MockEvent("scroll"));
    assert.equal(animationFrames.length, 1);
    flushFrame();
  });
  test("does not write geometry when target and popover rectangles are unchanged", async () => {
    const { driver, elements } = installDriver(),
      step = createStep();
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    let writes = 0;
    const original = elements.popover.style.setProperty.bind(elements.popover.style);
    elements.popover.style.setProperty = (name, value) => {
      writes += 1;
      original(name, value);
    };
    window.dispatchEvent(new MockEvent("resize"));
    flushFrame();
    assert.equal(writes, 0);
  });
  test("tracks only event invalidations by default and schedules continuous frames on request", async () => {
    const events = installDriver(),
      eventsStep = createStep();
    eventsStep.target = createTarget() as unknown as HTMLElement;
    await events.driver.show(eventsStep, "advance", new AbortController().signal);
    window.dispatchEvent(new MockEvent("resize"));
    flushFrame();
    assert.equal(animationFrames.length, 0);
    await events.driver.clear(new AbortController().signal);
    const continuous = installDriver(),
      continuousStep = createStep({ targetTracking: "continuous" });
    continuousStep.target = createTarget() as unknown as HTMLElement;
    await continuous.driver.show(continuousStep, "advance", new AbortController().signal);
    assert.equal(animationFrames.length, 1);
    flushFrame();
    assert.equal(animationFrames.length, 1);
  });
  test("clears step resources and terminal dispose remains idempotent", async () => {
    const { driver } = installDriver(),
      step = createStep({ targetTracking: "continuous" });
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    assert.equal(TestResizeObserver.instances.length, 1);
    await driver.clear(new AbortController().signal);
    await driver.clear(new AbortController().signal);
    driver.dispose();
    driver.dispose();
    window.dispatchEvent(new MockEvent("resize"));
    assert.equal(animationFrames.length, 1);
    assert.equal(
      TestResizeObserver.instances.every((observer) => observer.disconnected),
      true,
    );
    assert.ok(cancelledFrames.length > 0);
  });
  test("ignores keyboard navigation from editables, modifiers, composition, and prevented events", async () => {
    const { calls, driver, elements } = installDriver(),
      input = document.createElement("input"),
      step = createStep();
    elements.popover.append(input);
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    elements.next.dispatchEvent(new MockEvent("click"));
    for (const init of [
      { key: "Enter", target: input },
      { ctrlKey: true, key: "Enter", target: elements.popover },
      { isComposing: true, key: "Enter", target: elements.popover },
    ])
      window.dispatchEvent(new MockKeyboardEvent("keydown", init));
    const prevented = new MockKeyboardEvent("keydown", { key: "Enter" });
    prevented.preventDefault();
    window.dispatchEvent(prevented);
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Enter", target: elements.popover }),
    );
    step.props.set((props) => ({ ...props, disableBackButton: true, disableNextButton: true }));
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Enter", target: elements.popover }),
    );
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowLeft", target: elements.popover }),
    );
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Escape", target: elements.popover }),
    );
    elements.next.dispatchEvent(new MockEvent("click"));
    elements.back.dispatchEvent(new MockEvent("click"));
    assert.deepEqual(calls, ["advance", "advance", "cancel"]);
  });
  test("loops modal Tab focus, starts directionally, restores focus, and toggles aria-modal", async () => {
    const initial = document.createElement("button");
    document.body.append(initial);
    initial.focus();
    const { driver, elements } = installDriver(),
      target = createTarget(),
      step = createStep();
    step.target = target as unknown as HTMLElement;
    await driver.show(step, "previous", new AbortController().signal);
    assert.equal(document.activeElement, elements.back);
    assert.equal(elements.popover.getAttribute("aria-modal"), "true");
    elements.next.focus();
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Tab", target: elements.next }));
    assert.equal(document.activeElement, elements.back);
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Tab", shiftKey: true, target: elements.back }),
    );
    assert.equal(document.activeElement, elements.next);
    await driver.clear(new AbortController().signal);
    assert.equal(document.activeElement, initial);
    assert.equal(elements.popover.getAttribute("aria-modal"), null);
    const allowed = createStep({ allowInteraction: true });
    allowed.target = target as unknown as HTMLElement;
    await driver.show(allowed, "advance", new AbortController().signal);
    assert.equal(elements.popover.getAttribute("aria-modal"), null);
  });
  test("scopes trigger lookup to the registered root and follows element replacement and detachment", async () => {
    const outside = document.createElement("button");
    outside.setAttribute("data-glow-tour-next-trigger", "");
    document.body.append(outside);
    const { driver, elements } = installDriver(),
      replacement = document.createElement("aside"),
      replacementNext = document.createElement("button");
    replacementNext.setAttribute("data-glow-tour-next-trigger", "");
    replacement.append(replacementNext);
    replacement.setRect({ height: 40, left: 0, top: 0, width: 160 });
    elements.root.replaceChild(replacement, elements.popover);
    driver.registerPopover(replacement as unknown as HTMLElement);
    const step = createStep();
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    assert.equal(outside.getAttribute("aria-keyshortcuts"), null);
    assert.equal(replacementNext.getAttribute("aria-keyshortcuts"), "Enter ArrowRight");
    driver.registerPopover(null);
    await driver.clear(new AbortController().signal);
  });
  test("aborts scrolling before it can activate a step", async () => {
    const { driver } = installDriver(),
      target = createTarget();
    target.setRect({ height: 20, left: 10, top: 2000, width: 20 });
    let scrolls = 0;
    target.scrollIntoView = () => {
      scrolls += 1;
    };
    const step = createStep();
    step.target = target as unknown as HTMLElement;
    const controller = new AbortController(),
      shown = driver.show(step, "advance", controller.signal);
    controller.abort();
    await assert.rejects(() => shown, { name: "AbortError" });
    assert.equal(scrolls, 1);
  });
});
