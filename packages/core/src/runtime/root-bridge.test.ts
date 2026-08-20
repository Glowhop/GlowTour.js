import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createGlowTour } from "../index";

const BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
const ROOT_OWNER_SYMBOL = Symbol.for("@glowhop/core-tour/root-owner/v1");

type Cleanup = () => void;

interface RootBinding {
  readonly ids: Readonly<{
    description: string;
    popover: string;
    root: string;
    title: string;
  }>;
  bindOverlay(element: SVGSVGElement): Cleanup;
  bindPointer(element: HTMLElement): Cleanup;
  bindPopover(element: HTMLElement): Cleanup;
  release(): void;
}

interface RootBridge {
  readonly version: 1;
  connectRoot(options: { adapter: unknown; idPrefix?: string; root: HTMLElement }): RootBinding;
}

function rootBridge(tour: object): RootBridge {
  const value: unknown = Reflect.get(tour, BRIDGE_SYMBOL);
  if (
    typeof value !== "object" ||
    value === null ||
    !Reflect.has(value, "connectRoot") ||
    typeof Reflect.get(value, "connectRoot") !== "function" ||
    Reflect.get(value, "version") !== 1
  ) {
    throw new Error("Expected a compatible private core tour bridge");
  }
  return value as RootBridge;
}

class MockStyle {
  readonly values = new Map<string, string>();

  removeProperty(name: string) {
    this.values.delete(name);
  }

  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }
}

class MockElement {
  readonly attributes = new Map<string, string>();
  readonly children: MockElement[] = [];
  readonly style = new MockStyle();
  parentElement: MockElement | null = null;
  isConnected = true;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: MockDocument,
  ) {}

  append(...children: MockElement[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  contains(node: MockElement | null): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  getBoundingClientRect() {
    return {
      bottom: 20,
      height: 20,
      left: 10,
      right: 30,
      toJSON: () => ({}),
      top: 10,
      width: 20,
      x: 10,
      y: 10,
    } as DOMRect;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  querySelector<T extends MockElement>(_selector: string): T | null {
    return null;
  }

  scrollIntoView() {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class MockDocument {
  readonly body = this.createElement("body");
  activeElement: MockElement | null = null;

  createElement(tagName: string) {
    return new MockElement(tagName, this);
  }

  createElementNS(_namespace: string, tagName: string) {
    return new MockElement(tagName, this);
  }

  getElementById(id: string): MockElement | null {
    return this.find(this.body, (element) => element.getAttribute("id") === id);
  }

  private find(root: MockElement, matches: (element: MockElement) => boolean): MockElement | null {
    if (matches(root)) return root;
    for (const child of root.children) {
      const found = this.find(child, matches);
      if (found) return found;
    }
    return null;
  }
}

const globals = [
  "HTMLElement",
  "ResizeObserver",
  "cancelAnimationFrame",
  "document",
  "requestAnimationFrame",
  "window",
] as const;
const originalGlobals = new Map(
  globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
let document: MockDocument;
let resizeObserverDisconnections = 0;

beforeEach(() => {
  document = new MockDocument();
  resizeObserverDisconnections = 0;
  const window = {
    addEventListener() {},
    innerHeight: 800,
    innerWidth: 1200,
    removeEventListener() {},
  };
  class ResizeObserver {
    disconnect() {
      resizeObserverDisconnections += 1;
    }
    observe() {}
  }
  const replacements = {
    HTMLElement: MockElement,
    ResizeObserver,
    cancelAnimationFrame() {},
    document,
    requestAnimationFrame() {
      return 1;
    },
    window,
  };
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
});

afterEach(() => {
  for (const key of globals) {
    const descriptor = originalGlobals.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function root() {
  const element = document.createElement("section");
  document.body.append(element);
  return element as unknown as HTMLElement;
}

function child(rootElement: HTMLElement, tagName = "div") {
  const element = document.createElement(tagName);
  (rootElement as unknown as MockElement).append(element);
  return element as unknown as HTMLElement;
}

describe("private root bridge", () => {
  test("imports in Node without DOM globals", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "-e",
        "delete globalThis.document; delete globalThis.window; delete globalThis.HTMLElement; await import('./packages/core/src/index.ts');",
      ],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    assert.equal(result.exitCode, 0, new TextDecoder().decode(result.stderr));
  });

  test("keeps the bridge non-enumerable on the public controller contract", () => {
    const tour = createGlowTour<string>();

    assert.deepEqual(Object.keys(tour).sort(), [
      "advance",
      "cancel",
      "create",
      "dispose",
      "goToStep",
      "previous",
      "run",
      "state",
      "updateCurrentStep",
    ]);
    assert.equal(Object.getOwnPropertyDescriptor(tour, BRIDGE_SYMBOL)?.enumerable, false);
    assert.equal(rootBridge(tour).version, 1);
  });

  test("does not add a root runtime export while legacy adapter exports remain transitional", async () => {
    const runtime = await import("../index");

    assert.deepEqual(Object.keys(runtime).sort(), [
      "Builder",
      "StepBuilder",
      "TourStore",
      "WorkflowInstance",
      "WorkflowStep",
      "create",
      "createGlowTour",
      "createTourStore",
      "createWorkflow",
    ]);
  });

  test("requires a root before run and uses the DOM driver after a root is connected", async () => {
    const tour = createGlowTour<string>();
    const definition = tour.create("empty").finish();

    await assert.rejects(() => tour.run(definition), /connected root/i);
    rootBridge(tour).connectRoot({ adapter: {}, root: root() });
    await tour.run(definition);
    assert.equal(tour.state.get().status, "finished");
  });

  test("prevents a second root lease and cross-instance root ownership", () => {
    const first = createGlowTour<string>();
    const second = createGlowTour<string>();
    const firstRoot = root();

    rootBridge(first).connectRoot({ adapter: {}, root: firstRoot });
    assert.throws(() => rootBridge(first).connectRoot({ adapter: {}, root: root() }), /live root/i);
    assert.throws(() => rootBridge(second).connectRoot({ adapter: {}, root: firstRoot }), /owned/i);

    const duplicateMarkerRoot = root();
    Reflect.set(duplicateMarkerRoot, ROOT_OWNER_SYMBOL, {});
    assert.throws(
      () => rootBridge(second).connectRoot({ adapter: {}, root: duplicateMarkerRoot }),
      /owned/i,
    );
  });

  test("allows separate tours to mount to separate roots", () => {
    const first = createGlowTour<string>();
    const second = createGlowTour<string>();

    const firstBinding = rootBridge(first).connectRoot({ adapter: {}, root: root() });
    const secondBinding = rootBridge(second).connectRoot({ adapter: {}, root: root() });

    assert.notEqual(firstBinding.ids.root, secondBinding.ids.root);
  });

  test("releases a root for remount and permanently rejects reconnect after dispose", () => {
    const tour = createGlowTour<string>();
    const firstRoot = root();
    const binding = rootBridge(tour).connectRoot({ adapter: {}, root: firstRoot });

    binding.release();
    assert.equal(Reflect.has(firstRoot, ROOT_OWNER_SYMBOL), false);
    rootBridge(tour).connectRoot({ adapter: {}, root: root() });
    tour.dispose();
    assert.throws(() => rootBridge(tour).connectRoot({ adapter: {}, root: root() }), /disposed/i);
  });

  test("does not let stale element cleanup unregister its replacement", () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ adapter: {}, root: mount });
    const first = child(mount);
    const second = child(mount);

    const releaseFirst = binding.bindPopover(first);
    binding.bindPopover(second);
    releaseFirst();

    assert.equal((second as unknown as MockElement).style.values.get("opacity"), undefined);
  });

  test("rejects elements outside the claimed root", () => {
    const tour = createGlowTour<string>();
    const binding = rootBridge(tour).connectRoot({ adapter: {}, root: root() });

    assert.throws(() => binding.bindPointer(root()), /descendant/i);
  });

  test("allocates and releases scoped ids without removing replaced attributes", () => {
    const occupied = document.createElement("div");
    occupied.setAttribute("id", "glow-tour-root");
    document.body.append(occupied);
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ adapter: {}, root: mount });

    assert.equal(binding.ids.root, "glow-tour-2-root");
    assert.equal((mount as unknown as MockElement).getAttribute("id"), "glow-tour-2-root");
    assert.equal(
      (mount as unknown as MockElement).getAttribute("data-glow-tour-id-prefix"),
      "glow-tour-2",
    );
    binding.release();
    assert.equal((mount as unknown as MockElement).getAttribute("id"), null);

    const remountTour = createGlowTour<string>();
    assert.equal(
      rootBridge(remountTour).connectRoot({ adapter: {}, root: root() }).ids.root,
      "glow-tour-2-root",
    );

    const explicitTour = createGlowTour<string>();
    const explicitRoot = root();
    const explicit = rootBridge(explicitTour).connectRoot({
      adapter: {},
      idPrefix: "guided_tour-1",
      root: explicitRoot,
    });
    assert.equal(explicit.ids.popover, "guided_tour-1-popover");
    assert.throws(
      () =>
        rootBridge(createGlowTour<string>()).connectRoot({
          adapter: {},
          idPrefix: "1bad",
          root: root(),
        }),
      /idPrefix/i,
    );
    explicitRoot.setAttribute("id", "changed-by-host");
    explicit.release();
    assert.equal(explicitRoot.getAttribute("id"), "changed-by-host");
  });

  test("releases active driver resources without disposing the tour", async () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ adapter: {}, root: mount });
    const target = child(mount, "button");
    const definition = tour
      .create("active")
      .step({ content: "content", target: () => target, title: "title" })
      .finish();

    await tour.run(definition);
    binding.release();
    assert.equal(resizeObserverDisconnections, 1);
    assert.equal(tour.state.get().status, "active");
    await assert.rejects(() => tour.run(definition), /connected root/i);
  });
});
