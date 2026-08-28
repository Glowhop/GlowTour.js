import { afterEach, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { type AdapterRootBinding, connectGlowTourRoot } from "../adapter";
import type { ReadonlyTourState } from "../index";
import { createGlowTour } from "../index";

const BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
const ROOT_OWNER_SYMBOL = Symbol.for("@glowhop/core-tour/root-owner/v1");
const PREFIX_RESERVATIONS_SYMBOL = Symbol.for("@glowhop/core-tour/id-prefix-reservations/v1");

function acceptReadonlyTourState<T>(state: ReadonlyTourState<T>) {
  return state;
}

type RootBinding = AdapterRootBinding;

interface RootBridge {
  readonly version: 1;
  connectRoot(options: { readonly idPrefix?: string; readonly root: HTMLElement }): RootBinding;
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
  onSetAttribute: ((name: string, value: string) => void) | null = null;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: MockDocument,
  ) {}

  get id() {
    return this.getAttribute("id") ?? "";
  }

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

  hasAttribute(name: string) {
    return this.attributes.has(name);
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
    this.onSetAttribute?.(name, value);
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

  querySelectorAll<T extends MockElement>(selector: string): T[] {
    if (selector !== "[id]") return [];
    return this.findAll(this.body, (element) => element.getAttribute("id") !== null) as T[];
  }

  private find(root: MockElement, matches: (element: MockElement) => boolean): MockElement | null {
    if (matches(root)) return root;
    for (const child of root.children) {
      const found = this.find(child, matches);
      if (found) return found;
    }
    return null;
  }

  private findAll(root: MockElement, matches: (element: MockElement) => boolean): MockElement[] {
    return [
      ...(matches(root) ? [root] : []),
      ...root.children.flatMap((child) => this.findAll(child, matches)),
    ];
  }
}

const globals = [
  "HTMLElement",
  "cancelAnimationFrame",
  "document",
  "requestAnimationFrame",
  "window",
] as const;
const originalGlobals = new Map(
  globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);
let document: MockDocument;
let animationFrameCancellations = 0;

beforeEach(() => {
  document = new MockDocument();
  animationFrameCancellations = 0;
  const window = {
    addEventListener() {},
    innerHeight: 800,
    innerWidth: 1200,
    removeEventListener() {},
  };
  const replacements = {
    HTMLElement: MockElement,
    cancelAnimationFrame() {
      animationFrameCancellations += 1;
    },
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

    assert.equal(acceptReadonlyTourState(tour.state), tour.state);
    assert.deepEqual(Object.keys(tour).sort(), [
      "advance",
      "cancel",
      "create",
      "dispose",
      "goToStep",
      "previous",
      "run",
      "state",
    ]);
    assert.equal("goAdvance" in tour, false);
    assert.equal("goPrevious" in tour, false);
    assert.equal("updateCurrentStep" in tour, false);
    assert.equal(Object.getOwnPropertyDescriptor(tour, BRIDGE_SYMBOL)?.enumerable, false);
    assert.equal(rootBridge(tour).version, 1);
  });

  test("exposes createGlowTour as the only public runtime value", async () => {
    const runtime = await import("../index");

    assert.deepEqual(Object.keys(runtime), ["createGlowTour"]);
  });

  test("requires a root before run and uses the DOM driver after a root is connected", async () => {
    const tour = createGlowTour<string>();
    const definition = tour.create("empty").build();

    await assert.rejects(() => tour.run(definition), /connected root/i);
    rootBridge(tour).connectRoot({ root: root() });
    await tour.run(definition);
    assert.equal(tour.state.get().status, "finished");
  });

  test("connects a real tour through the supported adapter entry", async () => {
    const tour = createGlowTour<string>();
    const binding = connectGlowTourRoot(tour, { root: root() });
    const definition = tour.create("empty").build();

    assert.equal(binding.ids.root, "glow-tour-root");
    await tour.run(definition);
    assert.equal(tour.state.get().status, "finished");
  });

  test("prevents a second root lease and cross-instance root ownership", () => {
    const first = createGlowTour<string>();
    const second = createGlowTour<string>();
    const firstRoot = root();

    rootBridge(first).connectRoot({ root: firstRoot });
    assert.throws(() => rootBridge(first).connectRoot({ root: root() }), /live root/i);
    assert.throws(() => rootBridge(second).connectRoot({ root: firstRoot }), /owned/i);

    const duplicateMarkerRoot = root();
    Reflect.set(duplicateMarkerRoot, ROOT_OWNER_SYMBOL, {});
    assert.throws(() => rootBridge(second).connectRoot({ root: duplicateMarkerRoot }), /owned/i);
  });

  test("reserves the in-progress lease before root attribute callbacks can reenter", () => {
    const tour = createGlowTour<string>();
    const mount = root() as unknown as MockElement;
    const otherRoot = root();
    let reentrantError: Error | null = null;
    mount.onSetAttribute = (name) => {
      if (name !== "id") return;
      try {
        rootBridge(tour).connectRoot({ root: otherRoot });
      } catch (error) {
        reentrantError = error as Error;
      }
    };

    rootBridge(tour).connectRoot({ root: mount as unknown as HTMLElement });

    assert.match(String(reentrantError), /live root/i);
    assert.equal(Reflect.has(otherRoot, ROOT_OWNER_SYMBOL), false);
  });

  test("rolls back a failed second attribute claim without leaking ownership or prefix reservations", () => {
    const tour = createGlowTour<string>();
    const mount = root() as unknown as MockElement;
    mount.onSetAttribute = (name) => {
      if (name === "data-glow-tour-id-prefix") throw new Error("second attribute failed");
    };

    assert.throws(
      () => rootBridge(tour).connectRoot({ root: mount as unknown as HTMLElement }),
      /second attribute failed/,
    );
    assert.equal(mount.getAttribute("id"), null);
    assert.equal(mount.getAttribute("data-glow-tour-id-prefix"), null);
    assert.equal(Reflect.has(mount, ROOT_OWNER_SYMBOL), false);
    assert.equal(
      (Reflect.get(document, PREFIX_RESERVATIONS_SYMBOL) as Map<string, object>).size,
      0,
    );
    assert.equal(
      rootBridge(createGlowTour<string>()).connectRoot({ root: root() }).ids.root,
      "glow-tour-root",
    );
  });

  test("does not treat a pending claim as a connected root when an attribute callback runs a tour", async () => {
    const tour = createGlowTour<string>();
    const mount = root() as unknown as MockElement;
    const definition = tour.create("pending-run").build();
    let pendingRun: Promise<void> | null = null;
    mount.onSetAttribute = (name) => {
      if (name === "id") pendingRun = tour.run(definition);
      if (name === "data-glow-tour-id-prefix") throw new Error("claim failed after pending run");
    };

    assert.throws(
      () => rootBridge(tour).connectRoot({ root: mount as unknown as HTMLElement }),
      /claim failed after pending run/,
    );
    await assert.rejects(pendingRun ?? Promise.resolve(), /connected root/i);
    assert.equal(tour.state.get().status, "idle");
  });

  test("does not publish idle or allow a listener remount while a pending claim rolls back", () => {
    const tour = createGlowTour<string>();
    const mount = root() as unknown as MockElement;
    let allowRemount = false;
    let remounts = 0;
    const unsubscribe = tour.state.subscribe((state) => {
      if (!allowRemount || state.status !== "idle") return;
      remounts += 1;
      rootBridge(tour).connectRoot({ root: root() });
    });
    mount.onSetAttribute = (name) => {
      if (name === "id") allowRemount = true;
      if (name === "data-glow-tour-id-prefix") throw new Error("claim failed before commit");
    };

    assert.throws(
      () => rootBridge(tour).connectRoot({ root: mount as unknown as HTMLElement }),
      /claim failed before commit/,
    );

    assert.equal(remounts, 0);
    rootBridge(tour).connectRoot({ root: root() });
    unsubscribe();
  });

  test("rolls back a claim when disposal occurs during an attribute callback", () => {
    const tour = createGlowTour<string>();
    const mount = root() as unknown as MockElement;
    mount.onSetAttribute = (name) => {
      if (name === "id") tour.dispose();
    };

    assert.throws(
      () => rootBridge(tour).connectRoot({ root: mount as unknown as HTMLElement }),
      /disposed|released/i,
    );
    assert.equal(mount.getAttribute("id"), null);
    assert.equal(mount.getAttribute("data-glow-tour-id-prefix"), null);
    assert.equal(Reflect.has(mount, ROOT_OWNER_SYMBOL), false);
    assert.equal(
      (Reflect.get(document, PREFIX_RESERVATIONS_SYMBOL) as Map<string, object>).size,
      0,
    );
    assert.throws(() => rootBridge(tour).connectRoot({ root: root() }), /disposed/i);
  });

  test("allows separate tours to mount to separate roots", () => {
    const first = createGlowTour<string>();
    const second = createGlowTour<string>();

    const firstBinding = rootBridge(first).connectRoot({ root: root() });
    const secondBinding = rootBridge(second).connectRoot({ root: root() });

    assert.notEqual(firstBinding.ids.root, secondBinding.ids.root);
  });

  test("releases a root for remount and permanently rejects reconnect after dispose", () => {
    const tour = createGlowTour<string>();
    const firstRoot = root();
    const binding = rootBridge(tour).connectRoot({ root: firstRoot });

    binding.release();
    assert.equal(Reflect.has(firstRoot, ROOT_OWNER_SYMBOL), false);
    rootBridge(tour).connectRoot({ root: root() });
    tour.dispose();
    assert.throws(() => rootBridge(tour).connectRoot({ root: root() }), /disposed/i);
  });

  test("does not let stale element cleanup unregister its replacement", () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ root: mount });
    const first = child(mount);
    const second = child(mount);

    const releaseFirst = binding.bindPopover(first);
    binding.bindPopover(second);
    releaseFirst();

    assert.equal((second as unknown as MockElement).style.values.get("opacity"), "0");
  });

  test("rejects elements outside the claimed root", () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ root: mount });

    assert.throws(() => binding.bindPointer(root()), /descendant/i);
    assert.throws(() => binding.bindPointer(mount), /descendant/i);
  });

  test("allocates and releases scoped ids without removing replaced attributes", () => {
    const occupied = document.createElement("div");
    occupied.setAttribute("id", "glow-tour-root");
    document.body.append(occupied);
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ root: mount });

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
      rootBridge(remountTour).connectRoot({ root: root() }).ids.root,
      "glow-tour-2-root",
    );

    const explicitTour = createGlowTour<string>();
    const explicitRoot = root();
    const explicit = rootBridge(explicitTour).connectRoot({
      idPrefix: "guided_tour-1",
      root: explicitRoot,
    });
    assert.equal(explicit.ids.popover, "guided_tour-1-popover");
    assert.throws(
      () =>
        rootBridge(createGlowTour<string>()).connectRoot({
          idPrefix: "1bad",
          root: root(),
        }),
      /idPrefix/i,
    );
    explicitRoot.setAttribute("id", "changed-by-host");
    explicit.release();
    assert.equal(explicitRoot.getAttribute("id"), "changed-by-host");
  });

  test("allows an explicit prefix when matching authored IDs are contained by its root", () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const header = child(mount);
    const popover = child(mount);
    header.setAttribute("id", "contained-title");
    popover.setAttribute("id", "contained-popover");

    const binding = rootBridge(tour).connectRoot({
      idPrefix: "contained",
      root: mount,
    });

    assert.equal(binding.ids.title, "contained-title");
    assert.equal(binding.ids.popover, "contained-popover");
    assert.equal(header.getAttribute("id"), "contained-title");
    assert.equal(popover.getAttribute("id"), "contained-popover");
  });

  test("rejects a matching authored ID outside the claimed root regardless of DOM order", () => {
    for (const outsideFirst of [false, true]) {
      const mount = document.createElement("section") as unknown as HTMLElement;
      const external = document.createElement("div") as unknown as HTMLElement;
      const header = child(mount);
      header.setAttribute("id", "collision-title");
      external.setAttribute("id", "collision-title");
      if (outsideFirst)
        document.body.append(external as unknown as MockElement, mount as unknown as MockElement);
      else
        document.body.append(mount as unknown as MockElement, external as unknown as MockElement);

      assert.throws(
        () =>
          rootBridge(createGlowTour<string>()).connectRoot({
            idPrefix: "collision",
            root: mount,
          }),
        /idPrefix is already in use/i,
      );
    }
  });

  test("releases active driver resources, aborts the operation, and permits a later remount", async () => {
    const tour = createGlowTour<string>();
    const mount = root();
    const binding = rootBridge(tour).connectRoot({ root: mount });
    const target = child(mount, "button");
    const definition = tour
      .create("active")
      .step({ content: "content", target: () => target, title: "title" })
      .build();

    await tour.run(definition);
    binding.release();
    assert.equal(animationFrameCancellations, 1);
    assert.equal(tour.state.get().status, "idle");
    await assert.rejects(() => tour.run(definition), /connected root/i);
    rootBridge(tour).connectRoot({ root: root() });
    await tour.run(definition);
    assert.equal(tour.state.get().status, "active");
  });

  test("releasing a root during onStart prevents later activation without public cancel hooks", async () => {
    const tour = createGlowTour<string>();
    const binding = rootBridge(tour).connectRoot({ root: root() });
    let cancelCalls = 0;
    const definition = tour
      .create("release-on-start", {
        onCancel: () => {
          cancelCalls += 1;
        },
        onStart: () => binding.release(),
      })
      .step({ content: "content", target: () => root(), title: "title" })
      .build();

    await tour.run(definition);

    assert.equal(cancelCalls, 0);
    assert.equal(tour.state.get().status, "idle");
  });

  test("releasing during target resolution or a navigation hook invalidates the stale operation", async () => {
    const resolverTour = createGlowTour<string>();
    const resolverBinding = rootBridge(resolverTour).connectRoot({ root: root() });
    await resolverTour.run(
      resolverTour
        .create("release-target")
        .step({
          content: "content",
          target: () => {
            resolverBinding.release();
            return root();
          },
          title: "title",
        })
        .build(),
    );
    assert.equal(resolverTour.state.get().status, "idle");

    const hookTour = createGlowTour<string>();
    const hookBinding = rootBridge(hookTour).connectRoot({ root: root() });
    const hookDefinition = hookTour
      .create("release-hook")
      .step({ content: "content", target: () => root(), title: "title" })
      .beforeAdvance(() => hookBinding.release())
      .build();
    await hookTour.run(hookDefinition);
    await hookTour.advance();
    assert.equal(hookTour.state.get().status, "idle");
  });

  test("completes release cleanup before an idle state listener remounts and is idempotent", async () => {
    const tour = createGlowTour<string>();
    const binding = rootBridge(tour).connectRoot({ root: root() });
    const definition = tour
      .create("release-remount")
      .step({ content: "content", target: () => root(), title: "title" })
      .build();
    await tour.run(definition);
    let remounts = 0;
    const unsubscribe = tour.state.subscribe((state) => {
      if (state.status !== "idle") return;
      remounts += 1;
      rootBridge(tour).connectRoot({ root: root() });
    });

    binding.release();
    binding.release();

    assert.equal(remounts, 1);
    await tour.run(definition);
    assert.equal(tour.state.get().status, "active");
    unsubscribe();
  });
});
