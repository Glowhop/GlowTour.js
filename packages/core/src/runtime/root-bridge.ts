import type { DomTourViewDriver } from "../dom/tour-view-driver";

const ADAPTER_BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
const ROOT_OWNER_SYMBOL = Symbol.for("@glowhop/core-tour/root-owner/v1");
const DOCUMENT_PREFIX_RESERVATIONS_SYMBOL = Symbol.for(
  "@glowhop/core-tour/id-prefix-reservations/v1",
);
const BRIDGE_VERSION = 1 as const;
const DEFAULT_ID_PREFIX = "glow-tour";
const ID_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

interface RootIds {
  readonly description: string;
  readonly popover: string;
  readonly root: string;
  readonly title: string;
}

interface RootBinding {
  readonly ids: RootIds;
  bindOverlay(element: SVGSVGElement): () => void;
  bindPointer(element: HTMLElement): () => void;
  bindPopover(element: HTMLElement): () => void;
  release(): void;
}

interface AttributeClaim {
  readonly name: string;
  readonly previous: string | null;
  readonly value: string;
}

class TourRootBinding<T> implements RootBinding {
  private released = false;
  private overlay: SVGSVGElement | null = null;
  private pointer: HTMLElement | null = null;
  private popover: HTMLElement | null = null;

  constructor(
    private readonly driver: DomTourViewDriver<T>,
    private readonly root: HTMLElement,
    readonly ids: RootIds,
    private readonly reservation: object,
    private readonly attributes: readonly AttributeClaim[],
    private readonly onRelease: (binding: TourRootBinding<T>) => void,
  ) {}

  bindOverlay(element: SVGSVGElement) {
    this.assertLiveElement(element);
    this.overlay = element;
    this.driver.registerOverlay(element);
    return () => {
      if (this.released || this.overlay !== element) return;
      this.overlay = null;
      this.driver.registerOverlay(null);
    };
  }

  bindPointer(element: HTMLElement) {
    this.assertLiveElement(element);
    this.pointer = element;
    this.driver.registerPointer(element);
    return () => {
      if (this.released || this.pointer !== element) return;
      this.pointer = null;
      this.driver.registerPointer(null);
    };
  }

  bindPopover(element: HTMLElement) {
    this.assertLiveElement(element);
    this.popover = element;
    this.driver.registerPopover(element);
    return () => {
      if (this.released || this.popover !== element) return;
      this.popover = null;
      this.driver.registerPopover(null);
    };
  }

  release() {
    if (this.released) return;
    this.released = true;
    this.overlay = null;
    this.pointer = null;
    this.popover = null;
    this.driver.releaseMount();
    releaseAttributes(this.root, this.attributes);
    releaseRootOwner(this.root, this.reservation);
    releasePrefix(this.root.ownerDocument, this.ids, this.reservation);
    this.onRelease(this);
  }

  private assertLiveElement(element: Element) {
    if (this.released) throw new Error("Glow tour root binding has been released");
    if (!this.root.contains(element)) {
      throw new Error("Glow tour elements must be descendants of the claimed root");
    }
  }
}

export function attachRootBridge<T>(
  tour: object,
  driver: DomTourViewDriver<T>,
  isDisposed: () => boolean,
) {
  let binding: TourRootBinding<T> | null = null;
  const bridge = Object.freeze({
    version: BRIDGE_VERSION,
    connectRoot(options: { adapter: unknown; idPrefix?: string; root: HTMLElement }): RootBinding {
      void options.adapter;
      if (isDisposed()) throw new Error("Cannot connect a root to a disposed glow tour");
      if (binding) throw new Error("Glow tour already has a live root lease");
      const root = options.root;
      if (!root?.ownerDocument) throw new Error("Glow tour root must belong to a document");
      if (Reflect.has(root, ROOT_OWNER_SYMBOL)) {
        throw new Error("Glow tour root is already owned by another tour");
      }
      const prefix = reservePrefix(root.ownerDocument, options.idPrefix);
      const reservation = {};
      claimRootOwner(root, reservation);
      reservePrefixOwnership(root.ownerDocument, prefix, reservation);
      const ids = idsFor(prefix);
      const attributes = claimAttributes(root, [
        ["id", ids.root],
        ["data-glow-tour-id-prefix", prefix],
      ]);
      driver.registerRoot(root);
      binding = new TourRootBinding(driver, root, ids, reservation, attributes, (released) => {
        if (binding === released) binding = null;
      });
      return binding;
    },
  });
  Object.defineProperty(tour, ADAPTER_BRIDGE_SYMBOL, {
    configurable: false,
    enumerable: false,
    value: bridge,
    writable: false,
  });
  return {
    assertConnected() {
      if (!binding) throw new Error("Glow tour requires a connected root before run()");
    },
    release() {
      binding?.release();
    },
  };
}

function claimAttributes(
  root: HTMLElement,
  entries: readonly (readonly [name: string, value: string])[],
) {
  return entries.map(([name, value]) => {
    const claim = { name, previous: root.getAttribute(name), value };
    root.setAttribute(name, value);
    return claim;
  });
}

function releaseAttributes(root: HTMLElement, attributes: readonly AttributeClaim[]) {
  for (const attribute of attributes) {
    if (root.getAttribute(attribute.name) !== attribute.value) continue;
    if (attribute.previous === null) root.removeAttribute(attribute.name);
    else root.setAttribute(attribute.name, attribute.previous);
  }
}

function claimRootOwner(root: HTMLElement, reservation: object) {
  Object.defineProperty(root, ROOT_OWNER_SYMBOL, {
    configurable: true,
    enumerable: false,
    value: reservation,
  });
}

function releaseRootOwner(root: HTMLElement, reservation: object) {
  if (Reflect.get(root, ROOT_OWNER_SYMBOL) === reservation) {
    Reflect.deleteProperty(root, ROOT_OWNER_SYMBOL);
  }
}

function idsFor(prefix: string): RootIds {
  return Object.freeze({
    description: `${prefix}-description`,
    popover: `${prefix}-popover`,
    root: `${prefix}-root`,
    title: `${prefix}-title`,
  });
}

function reservePrefix(document: Document, requestedPrefix: string | undefined) {
  if (requestedPrefix !== undefined && !ID_PREFIX_PATTERN.test(requestedPrefix)) {
    throw new Error("Glow tour idPrefix must match [A-Za-z][A-Za-z0-9_-]*");
  }
  if (requestedPrefix !== undefined) {
    if (prefixIsAvailable(document, requestedPrefix)) return requestedPrefix;
    throw new Error(`Glow tour idPrefix is already in use: ${requestedPrefix}`);
  }
  for (let suffix = 1; ; suffix += 1) {
    const prefix = suffix === 1 ? DEFAULT_ID_PREFIX : `${DEFAULT_ID_PREFIX}-${suffix}`;
    if (prefixIsAvailable(document, prefix)) return prefix;
  }
}

function prefixIsAvailable(document: Document, prefix: string) {
  const reservations = prefixReservations(document);
  if (reservations.has(prefix)) return false;
  return Object.values(idsFor(prefix)).every((id) => document.getElementById(id) === null);
}

function reservePrefixOwnership(document: Document, prefix: string, reservation: object) {
  prefixReservations(document).set(prefix, reservation);
}

function releasePrefix(document: Document, ids: RootIds, reservation: object) {
  const prefix = ids.root.slice(0, -"-root".length);
  const reservations = prefixReservations(document);
  if (reservations.get(prefix) === reservation) reservations.delete(prefix);
}

function prefixReservations(document: Document) {
  const current: unknown = Reflect.get(document, DOCUMENT_PREFIX_RESERVATIONS_SYMBOL);
  if (current instanceof Map) return current as Map<string, object>;
  const reservations = new Map<string, object>();
  Object.defineProperty(document, DOCUMENT_PREFIX_RESERVATIONS_SYMBOL, {
    configurable: true,
    enumerable: false,
    value: reservations,
  });
  return reservations;
}
