import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { create } from "../builder";
import { ActiveStep } from "../runtime/active-step";
import { TourController } from "../runtime/tour-controller";
import { DomTourViewDriver, type TourViewCommands } from "./tour-view-driver";

type Listener = (event: MockEvent) => void;
type Rect = { left: number; top: number; width: number; height: number };

interface MockAnimation {
  cancelled: boolean;
  committed: boolean;
  finished: Promise<void>;
  resolve(): void;
}

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
  getPropertyValue(name: string) {
    return this.values.get(name) ?? "";
  }
  removeProperty(name: string) {
    this.values.delete(name);
  }
  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }
}
class MockElement extends MockNode {
  disabled = false;
  display = "block";
  hidden = false;
  visibility = "visible";
  readonly attributes = new Map<string, string>();
  readonly children: MockElement[] = [];
  readonly style = new MockStyle();
  isConnected = true;
  private rect: Rect = { height: 0, left: 0, top: 0, width: 0 };
  constructor(readonly tagName: string) {
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
    document.dispatchEvent(new MockEvent("focusin", { target: this }));
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
        : selector.includes("cancel-trigger")
          ? this.hasAttribute("data-glow-tour-cancel-trigger")
          : selector.includes(this.tagName)
            ? true
            : selector === "path"
              ? this.tagName === "path"
              : false;
  }
  querySelector<T extends MockElement>(selector: string): T | null {
    return this.querySelectorAll<T>().find((element: T) => element.matches(selector)) ?? null;
  }
  querySelectorAll<T extends MockElement>(selector = ""): T[] {
    const descendants = this.children.flatMap((child): MockElement[] => [
      child,
      ...child.querySelectorAll<T>(),
    ]);
    return (selector ? descendants.filter((child) => child.matches(selector)) : descendants) as T[];
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
    let resolve = () => {};
    const animation: MockAnimation = {
      cancelled: false,
      committed: false,
      finished:
        animationMode === "controlled"
          ? new Promise<void>((nextResolve) => {
              resolve = nextResolve;
            })
          : Promise.resolve(),
      resolve: () => resolve(),
    };
    createdAnimations.push(animation);
    return {
      cancel() {
        animation.cancelled = true;
        animation.resolve();
      },
      commitStyles() {
        animation.committed = true;
      },
      finished: animation.finished,
    };
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
  getComputedStyle(element: MockElement) {
    return { display: element.hidden ? "none" : element.display, visibility: element.visibility };
  }
  matchMedia() {
    return { matches: reducedMotion };
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
let animationMode: "controlled" | "resolved";
let createdAnimations: MockAnimation[];
let cancelledFrames: number[];
let document: MockDocument;
let reducedMotion: boolean;
let window: MockWindow;
beforeEach(() => {
  animationFrames = [];
  animationMode = "resolved";
  createdAnimations = [];
  reducedMotion = false;
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
function resolveAnimations(start: number, end = createdAnimations.length) {
  for (const animation of createdAnimations.slice(start, end)) animation.resolve();
}
function createCommands(): { commands: TourViewCommands; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    commands: {
      advance: async () => void calls.push("advance"),
      canAdvance: () => true,
      canCancel: () => true,
      canPrevious: () => true,
      cancel: async () => void calls.push("cancel"),
      previous: async () => void calls.push("previous"),
    },
  };
}
function createStep(
  options: {
    allowInteraction?: boolean;
    targetTracking?: "events" | "continuous";
    animated?: boolean;
    cancellable?: boolean;
  } = {},
) {
  const workflow = create<string>("dom-driver", {
    animated: options.animated,
    cancellable: options.cancellable,
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
  test("snapshots prototype-accessor rectangles without rewriting unchanged geometry", async () => {
    const { driver, elements } = installDriver(),
      step = createStep(),
      target = createTarget();
    const values = { height: 20, left: 10, top: 10, width: 20 };
    const rectangle = Object.create(null) as DOMRect;
    Object.defineProperties(
      rectangle,
      Object.fromEntries(
        Object.entries({
          bottom: () => values.top + values.height,
          height: () => values.height,
          left: () => values.left,
          right: () => values.left + values.width,
          top: () => values.top,
          width: () => values.width,
          x: () => values.left,
          y: () => values.top,
        }).map(([key, get]) => [key, { get }]),
      ),
    );
    target.getBoundingClientRect = () => rectangle;
    step.target = target as unknown as HTMLElement;
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

    const overlay = document.createElementNS("svg", "svg");
    overlay.append(document.createElementNS("svg", "path"));
    elements.root.append(overlay);
    driver.registerOverlay(overlay as unknown as SVGSVGElement);
    assert.equal(overlay.getAttribute("viewBox"), "0 0 1200 800");
    assert.equal(overlay.querySelector("path")?.style.getPropertyValue("d").includes("NaN"), false);
  });
  test("updates popover geometry for a same-placement ten-pixel target move", async () => {
    const { driver, elements } = installDriver(),
      step = createStep(),
      target = createTarget();
    target.setRect({ height: 20, left: 500, top: 100, width: 20 });
    step.target = target as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    const before = elements.popover.style.transform;
    target.setRect({ height: 20, left: 500, top: 110, width: 20 });
    window.dispatchEvent(new MockEvent("scroll"));
    flushFrame();
    assert.notEqual(elements.popover.style.transform, before);
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
  test("disables every element animation and pointer loop for workflow animation policy or reduced motion", async () => {
    for (const mode of ["workflow", "reduced-motion"] as const) {
      createdAnimations = [];
      reducedMotion = mode === "reduced-motion";
      const { driver } = installDriver(),
        step = createStep({ animated: mode === "workflow" ? false : undefined });
      step.target = createTarget() as unknown as HTMLElement;
      await driver.show(step, "advance", new AbortController().signal);
      assert.equal(createdAnimations.length, 3);
    }
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
  test("processes Escape from nested contenteditables but ignores navigation and modified keys", async () => {
    const { calls, driver, elements } = installDriver(),
      editor = document.createElement("div"),
      nested = document.createElement("span"),
      step = createStep();
    editor.setAttribute("contenteditable", "true");
    editor.append(nested);
    elements.popover.append(editor);
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Enter", target: nested }));
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Escape", target: nested }));
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { altKey: true, key: "Escape", target: nested }),
    );
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Escape", metaKey: true, target: nested }),
    );
    const composing = new MockKeyboardEvent("keydown", { isComposing: true, key: "Escape" });
    window.dispatchEvent(composing);
    assert.deepEqual(calls, ["cancel"]);
    assert.equal(composing.defaultPrevented, false);
  });
  test("routes keyboard and cancel-button requests through the controller cancellation permission", async () => {
    const { driver, elements } = installDriver(),
      target = createTarget(),
      cancel = document.createElement("button"),
      tour = new TourController(driver);
    cancel.setAttribute("data-glow-tour-cancel-trigger", "");
    elements.popover.append(cancel);
    const denied = tour
      .create("denied", { cancellable: false })
      .step({ content: "content", target: () => target as unknown as HTMLElement, title: "title" })
      .finish();
    await tour.run(denied);
    const escapeEvent = new MockKeyboardEvent("keydown", {
      key: "Escape",
      target: elements.popover,
    });
    const back = new MockKeyboardEvent("keydown", { key: "ArrowLeft", target: elements.popover });
    window.dispatchEvent(escapeEvent);
    window.dispatchEvent(back);
    cancel.dispatchEvent(new MockEvent("click"));
    await new Promise<void>((resolve) => setTimeout(resolve));
    assert.equal(tour.state.get().status, "active");
    assert.equal(escapeEvent.defaultPrevented, false);
    assert.equal(back.defaultPrevented, false);
    assert.equal(elements.back.disabled, true);
    assert.equal(elements.back.getAttribute("aria-disabled"), "true");
    assert.equal(cancel.disabled, true);
    assert.equal(cancel.getAttribute("aria-disabled"), "true");

    const allowed = tour
      .create("allowed", { cancellable: true })
      .step({ content: "content", target: () => target as unknown as HTMLElement, title: "title" })
      .finish();
    await tour.run(allowed);
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Escape", target: elements.popover }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve));
    assert.equal(tour.state.get().status, "cancelled");
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
  test("focuses the directional trigger after controller transitions settle", async () => {
    const { driver, elements } = installDriver(),
      firstTarget = createTarget(),
      secondTarget = createTarget(),
      tour = new TourController(driver),
      workflow = tour
        .create("focus-order")
        .step({ content: "one", target: () => firstTarget as unknown as HTMLElement, title: "one" })
        .step({
          content: "two",
          target: () => secondTarget as unknown as HTMLElement,
          title: "two",
        })
        .finish();

    await tour.run(workflow);
    assert.equal(document.activeElement, elements.next);
    await tour.advance();
    assert.equal(document.activeElement, elements.next);
    await tour.previous();
    assert.equal(document.activeElement, elements.back);
  });
  test("loops modal Tab only through visible enabled controls", async () => {
    const { driver, elements } = installDriver(),
      hidden = document.createElement("button"),
      disabled = document.createElement("button"),
      ariaDisabled = document.createElement("button"),
      displayNone = document.createElement("button"),
      inertHost = document.createElement("div"),
      inertButton = document.createElement("button"),
      visible = document.createElement("button"),
      step = createStep();
    hidden.hidden = true;
    disabled.disabled = true;
    disabled.setAttribute("disabled", "");
    ariaDisabled.setAttribute("aria-disabled", "true");
    displayNone.display = "none";
    inertHost.setAttribute("inert", "");
    inertHost.append(inertButton);
    elements.popover.append(hidden, disabled, ariaDisabled, displayNone, inertHost, visible);
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    visible.focus();
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Tab", target: visible }));
    assert.equal(document.activeElement, elements.back);
    elements.back.focus();
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Tab", shiftKey: true, target: elements.back }),
    );
    assert.equal(document.activeElement, visible);
  });
  test("loops modal Tab through native candidates and excludes CSS-hidden ancestors", async () => {
    const { driver, elements } = installDriver(),
      summary = document.createElement("summary"),
      audio = document.createElement("audio"),
      hiddenHost = document.createElement("div"),
      hiddenVideo = document.createElement("video"),
      step = createStep();
    audio.setAttribute("controls", "");
    hiddenHost.visibility = "hidden";
    hiddenVideo.setAttribute("controls", "");
    hiddenHost.append(hiddenVideo);
    elements.popover.append(summary, audio, hiddenHost);
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    audio.focus();
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Tab", target: audio }));
    assert.equal(document.activeElement, elements.back);
    elements.back.focus();
    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Tab", shiftKey: true, target: elements.back }),
    );
    assert.equal(document.activeElement, audio);
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
  test("releases active wrappers and rebinds focus, observers, and controls after replacement", async () => {
    const { calls, driver, elements } = installDriver(),
      target = createTarget(),
      replacementRoot = document.createElement("section"),
      replacementPopover = document.createElement("aside"),
      replacementNext = document.createElement("button"),
      replacementOverlay = document.createElementNS("svg", "svg"),
      replacementPointer = document.createElement("div"),
      step = createStep();
    replacementNext.setAttribute("data-glow-tour-next-trigger", "");
    replacementPopover.append(replacementNext);
    replacementPopover.setRect({ height: 40, left: 0, top: 0, width: 160 });
    replacementOverlay.append(document.createElementNS("svg", "path"));
    replacementRoot.append(replacementPopover, replacementOverlay, replacementPointer);
    document.body.append(replacementRoot);
    step.target = target as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    const oldObserver = TestResizeObserver.instances[0];
    driver.registerRoot(replacementRoot as unknown as HTMLElement);
    driver.registerPopover(replacementPopover as unknown as HTMLElement);
    driver.registerOverlay(replacementOverlay as unknown as SVGSVGElement);
    driver.registerPointer(replacementPointer as unknown as HTMLElement);
    await new Promise<void>((resolve) => setTimeout(resolve));
    elements.next.dispatchEvent(new MockEvent("click"));
    replacementNext.dispatchEvent(new MockEvent("click"));
    assert.deepEqual(calls, ["advance"]);
    assert.equal(oldObserver?.disconnected, true);
    assert.equal(
      TestResizeObserver.instances.filter((observer) => !observer.disconnected).length,
      1,
    );
    assert.equal(elements.popover.getAttribute("aria-hidden"), "true");
    assert.equal(elements.popover.getAttribute("inert"), "true");
    assert.equal(elements.pointer.getAttribute("aria-hidden"), "true");
    assert.equal(document.activeElement, replacementNext);
  });
  test("retains injected commands across a nonterminal mount release", async () => {
    const { calls, driver, elements } = installDriver(),
      firstTarget = createTarget(),
      firstStep = createStep();
    firstStep.target = firstTarget as unknown as HTMLElement;
    await driver.show(firstStep, "advance", new AbortController().signal);
    driver.releaseMount();

    const replacement = createElements(),
      replacementTarget = createTarget(),
      replacementStep = createStep();
    replacementStep.target = replacementTarget as unknown as HTMLElement;
    driver.registerRoot(replacement.root as unknown as HTMLElement);
    driver.registerPopover(replacement.popover as unknown as HTMLElement);
    driver.registerOverlay(replacement.overlay as unknown as SVGSVGElement);
    driver.registerPointer(replacement.pointer as unknown as HTMLElement);
    await driver.show(replacementStep, "advance", new AbortController().signal);

    replacement.next.dispatchEvent(new MockEvent("click"));
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Enter" }));
    assert.deepEqual(calls, ["advance", "advance"]);
    assert.equal(elements.next.listeners.get("click")?.size ?? 0, 0);
  });
  test("deactivates focus guarding when an active popover detaches and reactivates it on replacement", async () => {
    const initial = document.createElement("button"),
      outside = document.createElement("button"),
      { driver, elements } = installDriver(),
      target = createTarget(),
      step = createStep();
    document.body.append(initial, outside);
    initial.focus();
    step.target = target as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    driver.registerPopover(null);
    assert.equal(document.activeElement, initial);
    outside.focus();
    assert.equal(document.activeElement, outside);

    const replacement = document.createElement("aside"),
      replacementNext = document.createElement("button");
    replacementNext.setAttribute("data-glow-tour-next-trigger", "");
    replacement.append(replacementNext);
    replacement.setRect({ height: 40, left: 0, top: 0, width: 160 });
    elements.root.append(replacement);
    driver.registerPopover(replacement as unknown as HTMLElement);
    await new Promise<void>((resolve) => setTimeout(resolve));
    outside.focus();
    assert.equal(document.activeElement, replacementNext);
  });
  test("does not attach stale resources after focus activation starts a replacement show", async () => {
    const { calls, driver } = installDriver(),
      targetA = createTarget(),
      targetB = createTarget(),
      workflowA = create<string>("focus-reentrant")
        .step({ content: "a", target: "#a", title: "a" })
        .on("click", (_event, _props, next) => next())
        .finish(),
      definitionA = workflowA.steps[0],
      stepB = createStep();
    if (!definitionA) throw new Error("Expected a step definition");
    const stepA = new ActiveStep(definitionA, workflowA.options);
    stepA.target = targetA as unknown as HTMLElement;
    stepB.target = targetB as unknown as HTMLElement;
    let replaced = false;
    document.addEventListener("focusin", () => {
      if (replaced) return;
      replaced = true;
      void driver.show(stepB, "advance", new AbortController().signal);
    });

    await assert.rejects(() => driver.show(stepA, "advance", new AbortController().signal), {
      name: "AbortError",
    });
    await new Promise<void>((resolve) => setTimeout(resolve));
    targetA.dispatchEvent(new MockEvent("click"));
    window.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Enter" }));
    assert.deepEqual(calls, ["advance"]);
    assert.equal(targetA.listeners.get("click")?.size ?? 0, 0);
    assert.equal(window.listeners.get("keydown")?.size ?? 0, 1);
    assert.equal(
      TestResizeObserver.instances.filter((observer) => !observer.disconnected).length,
      1,
    );
  });
  test("abandons a show when focus restoration starts a replacement", async () => {
    const initial = document.createElement("button"),
      { calls, driver, elements } = installDriver(),
      oldTarget = createTarget(),
      targetA = createTarget(),
      targetB = createTarget(),
      oldStep = createStep(),
      workflowA = create<string>("restored-show")
        .step({ content: "a", disableNextButton: true, target: "#a", title: "a" })
        .finish(),
      definitionA = workflowA.steps[0],
      stepB = createStep();
    if (!definitionA) throw new Error("Expected a step definition");
    const stepA = new ActiveStep(definitionA, workflowA.options);
    document.body.append(initial);
    initial.focus();
    oldStep.target = oldTarget as unknown as HTMLElement;
    stepA.target = targetA as unknown as HTMLElement;
    stepB.target = targetB as unknown as HTMLElement;
    await driver.show(oldStep, "advance", new AbortController().signal);

    let replacement: Promise<void> | undefined;
    const startReplacement = (event: MockEvent) => {
      if (event.target === initial && !replacement) {
        replacement = driver.show(stepB, "advance", new AbortController().signal);
      }
    };
    document.addEventListener("focusin", startReplacement);
    try {
      await assert.rejects(() => driver.show(stepA, "advance", new AbortController().signal), {
        name: "AbortError",
      });
      await replacement;
    } finally {
      document.removeEventListener("focusin", startReplacement);
    }

    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Enter", target: elements.popover }),
    );
    assert.deepEqual(calls, ["advance"]);
    assert.equal(targetA.listeners.get("click")?.size ?? 0, 0);
    assert.equal(
      TestResizeObserver.instances.filter((observer) => !observer.disconnected).length,
      1,
    );
  });
  test("abandons a clear when focus restoration starts a replacement", async () => {
    const initial = document.createElement("button"),
      { calls, driver, elements } = installDriver(),
      oldTarget = createTarget(),
      targetB = createTarget(),
      oldStep = createStep(),
      stepB = createStep();
    document.body.append(initial);
    initial.focus();
    oldStep.target = oldTarget as unknown as HTMLElement;
    stepB.target = targetB as unknown as HTMLElement;
    await driver.show(oldStep, "advance", new AbortController().signal);

    let replacement: Promise<void> | undefined;
    const startReplacement = (event: MockEvent) => {
      if (event.target === initial && !replacement) {
        replacement = driver.show(stepB, "advance", new AbortController().signal);
      }
    };
    document.addEventListener("focusin", startReplacement);
    try {
      await assert.rejects(() => driver.clear(new AbortController().signal), {
        name: "AbortError",
      });
      await replacement;
    } finally {
      document.removeEventListener("focusin", startReplacement);
    }

    window.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "Enter", target: elements.popover }),
    );
    assert.deepEqual(calls, ["advance"]);
    assert.equal(elements.popover.getAttribute("aria-hidden"), null);
    assert.equal(
      TestResizeObserver.instances.filter((observer) => !observer.disconnected).length,
      1,
    );
  });
  test("binds async event commands to the active step generation", async () => {
    let release: (() => void) | undefined;
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { calls, driver } = installDriver(),
      targetA = createTarget(),
      targetB = createTarget(),
      workflowA = create<string>("event-generation")
        .step({ content: "a", target: "#a", title: "a" })
        .on("click", async (_event, _props, next) => {
          await handlerGate;
          await next();
        })
        .finish(),
      definitionA = workflowA.steps[0],
      stepB = createStep();
    if (!definitionA) throw new Error("Expected a step definition");
    const stepA = new ActiveStep(definitionA, workflowA.options);
    stepA.target = targetA as unknown as HTMLElement;
    stepB.target = targetB as unknown as HTMLElement;
    await driver.show(stepA, "advance", new AbortController().signal);
    targetA.dispatchEvent(new MockEvent("click"));
    await Promise.resolve();
    await driver.show(stepB, "advance", new AbortController().signal);
    release?.();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(calls, []);
  });
  test("rejects a pre-aborted show before it scrolls or activates", async () => {
    const { driver } = installDriver(),
      target = createTarget();
    target.setRect({ height: 20, left: 10, top: 2000, width: 20 });
    let scrolls = 0;
    target.scrollIntoView = () => {
      scrolls += 1;
    };
    const step = createStep();
    step.target = target as unknown as HTMLElement;
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(() => driver.show(step, "advance", controller.signal), {
      name: "AbortError",
    });
    assert.equal(scrolls, 0);
    assert.equal(TestResizeObserver.instances.length, 0);
    assert.equal(window.listeners.get("keydown")?.size ?? 0, 0);
  });
  test("rejects a mid-animation clear and leaves no listeners, observer, or animation continuation", async () => {
    const { driver } = installDriver(),
      step = createStep();
    step.target = createTarget() as unknown as HTMLElement;
    await driver.show(step, "advance", new AbortController().signal);
    animationMode = "controlled";
    createdAnimations = [];
    const controller = new AbortController();
    const clearing = driver.clear(controller.signal);
    await Promise.resolve();
    controller.abort();
    await assert.rejects(() => clearing, { name: "AbortError" });
    resolveAnimations(0);
    assert.equal(
      TestResizeObserver.instances.every((observer) => observer.disconnected),
      true,
    );
    assert.equal(window.listeners.get("keydown")?.size ?? 0, 0);
    assert.equal(
      createdAnimations.some((animation) => animation.committed),
      false,
    );
  });
  test("keeps a newer shown step active when older show and clear animations settle later", async () => {
    animationMode = "controlled";
    const { driver, elements } = installDriver(),
      targetA = createTarget(),
      targetB = createTarget(),
      stepA = createStep(),
      stepB = createStep();
    stepA.target = targetA as unknown as HTMLElement;
    stepB.target = targetB as unknown as HTMLElement;
    const shownA = driver.show(stepA, "advance", new AbortController().signal);
    await Promise.resolve();
    const clearA = driver.clear(new AbortController().signal);
    const bStart = createdAnimations.length;
    const shownB = driver.show(stepB, "advance", new AbortController().signal);
    await Promise.resolve();
    resolveAnimations(bStart);
    await shownB;
    resolveAnimations(0, bStart);
    await assert.rejects(() => shownA, { name: "AbortError" });
    await assert.rejects(() => clearA, { name: "AbortError" });
    assert.equal(document.activeElement, elements.next);
    assert.equal(
      TestResizeObserver.instances.filter((observer) => !observer.disconnected).length,
      1,
    );
    assert.equal(elements.popover.style.values.get("opacity"), "1");
  });
  test("cancels pending show animations on disposal without late activation or DOM writes", async () => {
    animationMode = "controlled";
    const { driver, elements } = installDriver(),
      step = createStep();
    step.target = createTarget() as unknown as HTMLElement;
    const shown = driver.show(step, "advance", new AbortController().signal);
    await Promise.resolve();
    driver.dispose();
    resolveAnimations(0);
    await assert.rejects(() => shown, { name: "AbortError" });
    assert.equal(TestResizeObserver.instances.length, 0);
    assert.equal(window.listeners.get("keydown")?.size ?? 0, 0);
    assert.equal(elements.popover.getAttribute("aria-hidden"), "true");
    assert.equal(
      createdAnimations.some((animation) => animation.cancelled),
      true,
    );
  });
});
