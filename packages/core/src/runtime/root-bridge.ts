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

interface RootLease {
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
    private readonly onMountReleaseStart: () => void,
    private readonly onMountReleaseComplete: () => void,
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
    try {
      runCleanup([
        this.onMountReleaseStart,
        () => this.driver.releaseMount(),
        () => releaseAttributes(this.root, this.attributes),
        () => releaseRootOwner(this.root, this.reservation),
        () =>
          releasePrefix(
            this.root.ownerDocument,
            this.ids.root.slice(0, -"-root".length),
            this.reservation,
          ),
      ]);
    } finally {
      this.onRelease(this);
      this.onMountReleaseComplete();
    }
  }

  private assertLiveElement(element: Element) {
    if (this.released) throw new Error("Glow tour root binding has been released");
    if (element === this.root || !this.root.contains(element)) {
      throw new Error("Glow tour elements must be descendants of the claimed root");
    }
  }
}

export function attachRootBridge<T>(
  tour: object,
  driver: DomTourViewDriver<T>,
  isDisposed: () => boolean,
  onMountReleaseStart: () => void,
  onMountReleaseComplete: () => void,
) {
  let binding: TourRootBinding<T> | null = null;
  let pending: RootLease | null = null;
  const bridge = Object.freeze({
    version: BRIDGE_VERSION,
    connectRoot(options: { adapter: unknown; idPrefix?: string; root: HTMLElement }): RootBinding {
      void options.adapter;
      if (isDisposed()) throw new Error("Cannot connect a root to a disposed glow tour");
      if (binding || pending) throw new Error("Glow tour already has a live root lease");
      const root = options.root;
      if (!root?.ownerDocument) throw new Error("Glow tour root must belong to a document");
      if (Reflect.has(root, ROOT_OWNER_SYMBOL)) {
        throw new Error("Glow tour root is already owned by another tour");
      }
      const reservation = {};
      const attributes: AttributeClaim[] = [];
      let prefix: string | null = null;
      let ids: RootIds | null = null;
      let ownsPrefix = false;
      let ownsRoot = false;
      let registeredRoot = false;
      let releasing = false;

      const rollback = () => {
        runCleanup([
          () => {
            if (!registeredRoot) return;
            registeredRoot = false;
            driver.releaseMount();
          },
          () => releaseAttributes(root, attributes),
          () => {
            if (!ownsRoot) return;
            ownsRoot = false;
            releaseRootOwner(root, reservation);
          },
          () => {
            if (!ownsPrefix || !prefix) return;
            ownsPrefix = false;
            releasePrefix(root.ownerDocument, prefix, reservation);
          },
        ]);
      };
      const pendingLease: RootLease = {
        release: () => {
          if (pending !== pendingLease || releasing) return;
          releasing = true;
          try {
            rollback();
          } finally {
            if (pending === pendingLease) pending = null;
          }
        },
      };

      // A pending lease reserves the claim before DOM callbacks can reenter, but is not a runnable mount.
      pending = pendingLease;
      try {
        prefix = reservePrefix(root.ownerDocument, options.idPrefix);
        claimRootOwner(root, reservation);
        ownsRoot = true;
        reservePrefixOwnership(root.ownerDocument, prefix, reservation);
        ownsPrefix = true;
        ids = idsFor(prefix);
        claimAttributes(
          root,
          [
            ["id", ids.root],
            ["data-glow-tour-id-prefix", prefix],
          ],
          attributes,
        );
        registeredRoot = true;
        driver.registerRoot(root);
        if (isDisposed()) throw new Error("Cannot connect a root to a disposed glow tour");
        if (pending !== pendingLease)
          throw new Error("Glow tour root lease was released while connecting");
        const live = new TourRootBinding(
          driver,
          root,
          ids,
          reservation,
          attributes,
          onMountReleaseStart,
          onMountReleaseComplete,
          (released) => {
            if (binding === released) binding = null;
          },
        );
        binding = live;
        pending = null;
        return live;
      } catch (error) {
        try {
          if (pending === pendingLease) pendingLease.release();
          else rollback();
        } catch {
          // The connection error is the useful public failure; cleanup has already attempted every owned claim.
        }
        throw error;
      }
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
      pending?.release();
    },
  };
}

function claimAttributes(
  root: HTMLElement,
  entries: readonly (readonly [name: string, value: string])[],
  attributes: AttributeClaim[],
) {
  for (const [name, value] of entries) {
    const claim = { name, previous: root.getAttribute(name), value };
    attributes.push(claim);
    root.setAttribute(name, value);
  }
}

function releaseAttributes(root: HTMLElement, attributes: readonly AttributeClaim[]) {
  runCleanup(
    attributes.map((attribute) => () => {
      if (root.getAttribute(attribute.name) !== attribute.value) return;
      if (attribute.previous === null) root.removeAttribute(attribute.name);
      else root.setAttribute(attribute.name, attribute.previous);
    }),
  );
}

function runCleanup(cleanups: readonly (() => void)[]) {
  let failed = false;
  let failure: unknown;
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      if (!failed) {
        failed = true;
        failure = error;
      }
    }
  }
  if (failed) throw failure;
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

function releasePrefix(document: Document, prefix: string, reservation: object) {
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
