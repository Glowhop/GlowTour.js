import type { WorkflowDefinition } from "../definition";
import { DomMutationLease } from "../dom/dom-mutation-lease";
import type { DomTourViewDriver } from "../dom/tour-view-driver";
import {
  ADAPTER_BRIDGE_SYMBOL,
  ADAPTER_BRIDGE_VERSION,
  type AdapterRootBinding,
  type AdapterRootIds,
} from "./adapter-contract";

const ROOT_OWNER_SYMBOL = Symbol.for("@glowhop/core-tour/root-owner/v1");
const DOCUMENT_PREFIX_RESERVATIONS_SYMBOL = Symbol.for(
  "@glowhop/core-tour/id-prefix-reservations/v1",
);
const DEFAULT_ID_PREFIX = "glow-tour";
const ID_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

interface RootLease {
  release(): void;
}

class TourRootBinding<T> implements AdapterRootBinding {
  private released = false;
  private overlay: SVGSVGElement | null = null;
  private pointer: HTMLElement | null = null;
  private popover: HTMLElement | null = null;

  constructor(
    private readonly driver: DomTourViewDriver<T>,
    private readonly root: HTMLElement,
    readonly ids: AdapterRootIds,
    private readonly reservation: object,
    private readonly mutations: DomMutationLease,
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

  hasPopover() {
    return this.popover !== null;
  }

  get document() {
    return this.root.ownerDocument;
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
        () => this.mutations.release(),
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
    version: ADAPTER_BRIDGE_VERSION,
    connectRoot(options: {
      readonly idPrefix?: string;
      readonly root: HTMLElement;
    }): AdapterRootBinding {
      if (isDisposed()) throw new Error("Cannot connect a root to a disposed glow tour");
      if (binding || pending) throw new Error("Glow tour already has a live root lease");
      const root = options.root;
      if (!root?.ownerDocument) throw new Error("Glow tour root must belong to a document");
      if (Reflect.has(root, ROOT_OWNER_SYMBOL)) {
        throw new Error("Glow tour root is already owned by another tour");
      }
      const reservation = {};
      const mutations = new DomMutationLease(root);
      let prefix: string | null = null;
      let ids: AdapterRootIds | null = null;
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
          () => mutations.release(),
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
        prefix = reservePrefix(root.ownerDocument, options.idPrefix, root);
        claimRootOwner(root, reservation);
        ownsRoot = true;
        reservePrefixOwnership(root.ownerDocument, prefix, reservation);
        ownsPrefix = true;
        ids = idsFor(prefix);
        mutations.setAttribute("id", ids.root);
        mutations.setAttribute("data-glow-tour-id-prefix", prefix);
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
          mutations,
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
    assertCanRun(workflow: WorkflowDefinition<T>) {
      if (!binding) throw new Error("Glow tour requires a connected root before run()");
      if (workflow.steps.length > 0 && !binding.hasPopover()) {
        throw new Error("Glow tour requires a connected popover before run()");
      }
      return binding.document;
    },
    release() {
      binding?.release();
      pending?.release();
    },
  };
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

function idsFor(prefix: string): AdapterRootIds {
  return Object.freeze({
    description: `${prefix}-description`,
    popover: `${prefix}-popover`,
    root: `${prefix}-root`,
    title: `${prefix}-title`,
  });
}

function reservePrefix(
  document: Document,
  requestedPrefix: string | undefined,
  root?: HTMLElement,
) {
  if (requestedPrefix !== undefined && !ID_PREFIX_PATTERN.test(requestedPrefix)) {
    throw new Error("Glow tour idPrefix must match [A-Za-z][A-Za-z0-9_-]*");
  }
  if (requestedPrefix !== undefined) {
    if (prefixIsAvailable(document, requestedPrefix, root)) return requestedPrefix;
    throw new Error(`Glow tour idPrefix is already in use: ${requestedPrefix}`);
  }
  for (let suffix = 1; ; suffix += 1) {
    const prefix = suffix === 1 ? DEFAULT_ID_PREFIX : `${DEFAULT_ID_PREFIX}-${suffix}`;
    if (prefixIsAvailable(document, prefix, root)) return prefix;
  }
}

function prefixIsAvailable(document: Document, prefix: string, root?: HTMLElement) {
  const reservations = prefixReservations(document);
  if (reservations.has(prefix)) return false;
  return Object.values(idsFor(prefix)).every((id) =>
    Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .filter((element) => element.id === id)
      .every((element) => root?.contains(element) === true),
  );
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
