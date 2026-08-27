import type { DynamicStepProps, TourState } from "@glowhop/core-tour";
import { getAdapterBridge, type RootBinding, vanillaAdapter } from "../adapter-bridge";
import type { VanillaGlowTour, VanillaTourContent } from "../glow-tour";

export const GLOW_TOUR_ELEMENT_NAMES = [
  "glow-tour-root",
  "glow-tour-header",
  "glow-tour-content",
  "glow-tour-footer",
  "glow-tour-popover",
  "glow-tour-pointer",
  "glow-tour-back-trigger",
  "glow-tour-next-trigger",
  "glow-tour-cancel-trigger",
  "glow-tour-overlay",
] as const;

export interface GlowTourRootElement extends HTMLElement {
  tour: VanillaGlowTour | null;
  idPrefix: string | undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    "glow-tour-root": GlowTourRootElement;
  }
}

const ROOT_CHANGE_EVENT = "glow-tour-root-change";

interface RootContext {
  readonly binding: RootBinding | null;
  readonly tour: VanillaGlowTour | null;
}

interface ActiveRootBinding {
  readonly binding: RootBinding;
  readonly idPrefix: string | undefined;
  readonly tour: VanillaGlowTour;
}

interface RootState {
  active: ActiveRootBinding | null;
  connected: boolean;
  pending: boolean;
  tour: VanillaGlowTour | null;
}

const ROOT_STATES = new WeakMap<HTMLElement, RootState>();

function canRegisterCustomElements() {
  return typeof customElements !== "undefined" && typeof HTMLElement !== "undefined";
}

function rootContext(root: HTMLElement): RootContext | null {
  const state = ROOT_STATES.get(root);
  if (!state) return null;
  return { binding: state.active?.binding ?? null, tour: state.tour };
}

function closestRoot(element: Element) {
  return element.closest<GlowTourRootElement>("glow-tour-root");
}

function subscribeToCurrentStep(
  tour: VanillaGlowTour,
  listener: (
    state: TourState<VanillaTourContent>,
    props: DynamicStepProps<VanillaTourContent>,
  ) => void,
) {
  const bindStep = (state: TourState<VanillaTourContent>) => {
    const step = state.currentStep;
    if (!step) {
      listener(state, { content: "", title: "" });
      return;
    }
    listener(state, step.currentProps);
  };
  const stateCleanup = tour.state.subscribe(bindStep);
  return () => {
    stateCleanup();
  };
}

function renderValue(element: HTMLElement, value: VanillaTourContent) {
  if (typeof value === "string") {
    element.textContent = value;
    return;
  }
  if (typeof Node !== "undefined" && value instanceof Node) {
    element.replaceChildren(value);
    return;
  }
  element.replaceChildren();
}

function createOverlaySvg(host: HTMLElement) {
  const existing = host.querySelector<SVGSVGElement>("svg[data-glow-tour-overlay]");
  if (existing) return existing;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-glow-tour-overlay", "");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("role", "presentation");
  svg.setAttribute("viewBox", "0 0 0 0");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("data-glow-tour-overlay-path", "");
  path.setAttribute("fill-rule", "evenodd");
  svg.appendChild(path);
  host.appendChild(svg);
  return svg;
}

function ownedElements(root: HTMLElement, selector: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.closest("glow-tour-root") === root,
  );
}

function rootState(root: HTMLElement) {
  const existing = ROOT_STATES.get(root);
  if (existing) return existing;
  const state: RootState = { active: null, connected: false, pending: false, tour: null };
  ROOT_STATES.set(root, state);
  return state;
}

function notifyRoot(root: HTMLElement) {
  root.dispatchEvent(new Event(ROOT_CHANGE_EVENT));
}

function replayUpgradeProperty(root: HTMLElement, property: "idPrefix" | "tour") {
  if (!Object.hasOwn(root, property)) return;
  const value: unknown = Reflect.get(root, property);
  Reflect.deleteProperty(root, property);
  Reflect.set(root, property, value);
}

function releaseRoot(root: HTMLElement) {
  const state = rootState(root);
  const active = state.active;
  if (!active) return;
  state.active = null;
  active.binding.release();
  notifyRoot(root);
}

function reconcileRoot(root: GlowTourRootElement) {
  const state = rootState(root);
  if (!state.connected) return;
  const current = state.active;
  const idPrefix = root.idPrefix;
  if (current?.tour === state.tour && current.idPrefix === idPrefix) return;
  releaseRoot(root);
  if (!state.tour) {
    notifyRoot(root);
    return;
  }
  const binding = getAdapterBridge(state.tour).connectRoot({
    adapter: vanillaAdapter,
    idPrefix,
    root,
  });
  state.active = { binding, idPrefix, tour: state.tour };
  notifyRoot(root);
}

function reconcileRootSoon(root: GlowTourRootElement) {
  const state = rootState(root);
  if (!state.connected) return;
  if (!state.active) {
    reconcileRoot(root);
    return;
  }
  if (state.pending) return;
  state.pending = true;
  queueMicrotask(() => {
    state.pending = false;
    reconcileRoot(root);
  });
}

interface AttributeSnapshot {
  readonly previous: string | null;
  value: string | null;
}

class ManagedAttributes {
  private readonly snapshots = new Map<HTMLElement, Map<string, AttributeSnapshot>>();
  private readonly relinquished = new Map<HTMLElement, Set<string>>();

  isManaged(element: HTMLElement, name: string) {
    return this.snapshots.get(element)?.has(name) === true;
  }

  isAuthored(element: HTMLElement, name: string) {
    return (
      this.relinquished.get(element)?.has(name) === true ||
      (!this.isManaged(element, name) && element.hasAttribute(name))
    );
  }

  set(element: HTMLElement, name: string, value: string | null) {
    this.relinquishChanged(element);
    const attributes = this.snapshots.get(element) ?? new Map<string, AttributeSnapshot>();
    if (!this.snapshots.has(element)) this.snapshots.set(element, attributes);
    const snapshot = attributes.get(name) ?? { previous: element.getAttribute(name), value };
    snapshot.value = value;
    attributes.set(name, snapshot);
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  capture(element: HTMLElement, name: string) {
    this.relinquishChanged(element);
    this.relinquished.get(element)?.delete(name);
    if (this.isManaged(element, name)) return;
    const attributes = this.snapshots.get(element) ?? new Map<string, AttributeSnapshot>();
    if (!this.snapshots.has(element)) this.snapshots.set(element, attributes);
    attributes.set(name, {
      previous: element.getAttribute(name),
      value: element.getAttribute(name),
    });
  }

  note(element: HTMLElement, name: string) {
    const snapshot = this.snapshots.get(element)?.get(name);
    if (snapshot) snapshot.value = element.getAttribute(name);
  }

  forget(element: HTMLElement, name: string) {
    const attributes = this.snapshots.get(element);
    if (!attributes) return;
    attributes.delete(name);
    if (attributes.size === 0) this.snapshots.delete(element);
  }

  relinquishChanged(element?: HTMLElement) {
    if (element) this.relinquishElement(element, this.snapshots.get(element));
    else
      for (const [currentElement, attributes] of this.snapshots)
        this.relinquishElement(currentElement, attributes);
  }

  private relinquishElement(
    element: HTMLElement,
    attributes: Map<string, AttributeSnapshot> | undefined,
  ) {
    if (!attributes) return;
    for (const [name, snapshot] of attributes) {
      if (element.getAttribute(name) === snapshot.value) continue;
      attributes.delete(name);
      const names = this.relinquished.get(element) ?? new Set<string>();
      names.add(name);
      this.relinquished.set(element, names);
    }
    if (attributes.size === 0) this.snapshots.delete(element);
  }

  restore() {
    this.relinquishChanged();
    for (const [element, attributes] of this.snapshots) {
      for (const [name, snapshot] of attributes) {
        if (element.getAttribute(name) !== snapshot.value) continue;
        if (snapshot.previous === null) element.removeAttribute(name);
        else element.setAttribute(name, snapshot.previous);
      }
    }
    this.snapshots.clear();
  }
}

function effectiveId(root: HTMLElement, selector: string, fallback: string) {
  const element = ownedElements(root, selector)[0];
  return element?.id || fallback;
}

function sameDescriptor(left: PropertyDescriptor | undefined, right: PropertyDescriptor) {
  return (
    Boolean(left?.configurable) === Boolean(right.configurable) &&
    Boolean(left?.enumerable) === Boolean(right.enumerable) &&
    left?.get === right.get &&
    left?.set === right.set &&
    left?.value === right.value &&
    Boolean(left?.writable) === Boolean(right.writable)
  );
}

function restoreDescriptor(
  element: object,
  name: PropertyKey,
  original: PropertyDescriptor | undefined,
  wrapper: PropertyDescriptor,
) {
  if (!sameDescriptor(Object.getOwnPropertyDescriptor(element, name), wrapper)) return;
  if (original) Object.defineProperty(element, name, original);
  else Reflect.deleteProperty(element, name);
}

export function registerGlowTourElements() {
  if (!canRegisterCustomElements()) return;

  class GlowTourRoot extends HTMLElement implements GlowTourRootElement {
    get tour() {
      return rootState(this).tour;
    }

    set tour(value: VanillaGlowTour | null) {
      const state = rootState(this);
      if (state.tour === value) return;
      state.tour = value;
      reconcileRootSoon(this);
    }

    get idPrefix() {
      return this.getAttribute("id-prefix") ?? undefined;
    }

    set idPrefix(value: string | undefined) {
      if (value === undefined) this.removeAttribute("id-prefix");
      else this.setAttribute("id-prefix", value);
    }

    static get observedAttributes() {
      return ["id-prefix"];
    }

    connectedCallback() {
      Object.setPrototypeOf(this, GlowTourRoot.prototype);
      replayUpgradeProperty(this, "idPrefix");
      replayUpgradeProperty(this, "tour");
      rootState(this).connected = true;
      this.setAttribute("data-glow-tour-root", "");
      reconcileRoot(this);
    }

    disconnectedCallback() {
      const state = rootState(this);
      state.connected = false;
      state.pending = false;
      releaseRoot(this);
    }

    attributeChangedCallback(name: string) {
      if (name === "id-prefix") reconcileRootSoon(this);
    }
  }

  abstract class ScopedElement extends HTMLElement {
    private cleanup?: () => void;
    protected readonly managedAttributes = new ManagedAttributes();
    private root?: GlowTourRootElement;

    connectedCallback() {
      this.rebind();
    }

    disconnectedCallback() {
      this.cleanup?.();
      this.cleanup = undefined;
      this.restoreManagedAttributes();
      this.root?.removeEventListener(ROOT_CHANGE_EVENT, this.rebind);
      this.root = undefined;
    }

    protected restoreManagedAttributes() {
      this.managedAttributes.restore();
    }

    protected readonly rebind = () => {
      this.cleanup?.();
      this.cleanup = undefined;
      this.managedAttributes.relinquishChanged();
      this.restoreManagedAttributes();
      const nextRoot = closestRoot(this);
      if (nextRoot !== this.root) {
        this.root?.removeEventListener(ROOT_CHANGE_EVENT, this.rebind);
        this.root = nextRoot ?? undefined;
        this.root?.addEventListener(ROOT_CHANGE_EVENT, this.rebind);
      }
      if (!nextRoot) return;
      const context = rootContext(nextRoot);
      if (!context?.tour) return;
      this.cleanup = this.bind(context);
    };

    protected bind(_context: RootContext): (() => void) | undefined {
      return undefined;
    }
  }

  abstract class ReactiveElement extends ScopedElement {
    protected override bind(context: RootContext) {
      if (!context.tour) return;
      return subscribeToCurrentStep(context.tour, (state, props) => {
        this.managedAttributes.relinquishChanged();
        this.render(state, props);
      });
    }

    protected abstract render(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ): void;
  }

  class GlowTourHeader extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-header", "");
      super.connectedCallback();
    }

    protected render(
      _state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const root = closestRoot(this);
      const binding = root ? rootContext(root)?.binding : null;
      if (binding && !this.managedAttributes.isAuthored(this, "id")) {
        this.managedAttributes.set(this, "id", binding.ids.title);
      }
      renderValue(this, props.title);
    }
  }

  class GlowTourContent extends ReactiveElement {
    connectedCallback() {
      if (!this.managedAttributes.isAuthored(this, "aria-live")) {
        this.managedAttributes.set(this, "aria-live", "polite");
      }
      this.setAttribute("data-glow-tour-content", "");
      super.connectedCallback();
    }

    protected render(
      _state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const root = closestRoot(this);
      const binding = root ? rootContext(root)?.binding : null;
      if (binding && !this.managedAttributes.isAuthored(this, "id")) {
        this.managedAttributes.set(this, "id", binding.ids.description);
      }
      renderValue(this, props.content);
    }
  }

  class GlowTourFooter extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-footer", "");
      super.connectedCallback();
    }

    protected render(
      _state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      this.hidden = props.hideFooter === true;
    }
  }

  class GlowTourPopover extends ScopedElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-popover", "");
      if (!this.managedAttributes.isAuthored(this, "role"))
        this.managedAttributes.set(this, "role", "dialog");
      if (!this.managedAttributes.isAuthored(this, "tabindex"))
        this.managedAttributes.set(this, "tabindex", "-1");
      super.connectedCallback();
    }

    protected override bind(context: RootContext) {
      if (!context.binding) return;
      this.managedAttributes.relinquishChanged();
      const root = closestRoot(this);
      if (!root) return;
      if (!this.managedAttributes.isAuthored(this, "id")) {
        this.managedAttributes.set(this, "id", context.binding.ids.popover);
      }
      if (!this.managedAttributes.isAuthored(this, "aria-describedby")) {
        this.managedAttributes.set(
          this,
          "aria-describedby",
          effectiveId(root, "[data-glow-tour-content]", context.binding.ids.description),
        );
      }
      if (!this.managedAttributes.isAuthored(this, "aria-labelledby")) {
        this.managedAttributes.set(
          this,
          "aria-labelledby",
          effectiveId(root, "[data-glow-tour-header]", context.binding.ids.title),
        );
      }
      return context.binding.bindPopover(this);
    }
  }

  class GlowTourPointer extends ScopedElement {
    connectedCallback() {
      this.setAttribute("aria-hidden", "true");
      this.setAttribute("data-glow-tour-pointer", "");
      if (!this.querySelector(":scope > [data-glow-tour-pointer-content]")) {
        const content = document.createElement("div");
        content.setAttribute("data-glow-tour-pointer-content", "");
        content.append(...Array.from(this.childNodes));
        this.replaceChildren(content);
      }
      super.connectedCallback();
    }

    protected override bind(context: RootContext) {
      if (!context.binding) return;
      return context.binding.bindPointer(this);
    }
  }

  class GlowTourOverlay extends ScopedElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-overlay-host", "");
      super.connectedCallback();
    }

    protected override bind(context: RootContext) {
      if (!context.binding) return;
      return context.binding.bindOverlay(createOverlaySvg(this));
    }
  }

  abstract class GlowTourTrigger extends ReactiveElement {
    protected abstract readonly action: "cancel" | "next" | "previous";
    private button?: HTMLButtonElement;
    private labelOwned = false;
    private labelSnapshot?: string;
    private capabilityDisabled = false;
    private consumerDisabled = false;
    private disabledPropertyWrapped = false;
    private syncingDisabled = false;
    private status: TourState<VanillaTourContent>["status"] = "idle";
    private restoreDisabledTracking?: () => void;
    private disabledObserver?: MutationObserver;

    connectedCallback() {
      this.button =
        this.querySelector<HTMLButtonElement>("button") ?? document.createElement("button");
      this.labelOwned = this.button.childNodes.length === 0;
      this.labelSnapshot = this.button.textContent ?? "";
      this.consumerDisabled =
        this.button.disabled ||
        this.button.getAttribute("aria-disabled") === "true" ||
        this.button.getAttribute("data-glow-tour-consumer-disabled") === "true";
      if (!this.button.parentElement) this.appendChild(this.button);
      this.button.type = "button";
      this.button.setAttribute(`data-glow-tour-${this.action}-trigger`, "");
      this.managedAttributes.set(this.button, "data-glow-tour-control-managed", "");
      this.trackConsumerDisabled();
      super.connectedCallback();
    }

    override disconnectedCallback() {
      this.restoreDisabledTracking?.();
      this.restoreDisabledTracking = undefined;
      this.disabledObserver?.disconnect();
      this.disabledObserver = undefined;
      if (this.button && this.labelOwned && this.labelSnapshot !== undefined) {
        this.button.textContent = this.labelSnapshot;
      }
      this.labelSnapshot = undefined;
      super.disconnectedCallback();
    }

    protected override restoreManagedAttributes() {
      this.syncingDisabled = true;
      super.restoreManagedAttributes();
      this.syncingDisabled = false;
    }

    protected render(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const binding = rootContext(closestRoot(this) as HTMLElement)?.binding;
      const button = this.button;
      if (!binding || !button) return;
      this.managedAttributes.set(button, "data-glow-tour-control-managed", "");
      if (!this.managedAttributes.isAuthored(button, "aria-controls")) {
        const root = closestRoot(this);
        this.managedAttributes.set(
          button,
          "aria-controls",
          root
            ? effectiveId(root, "[data-glow-tour-popover]", binding.ids.popover)
            : binding.ids.popover,
        );
      }
      const details = this.details(state, props);
      this.status = state.status;
      this.hidden = details.hidden;
      this.capabilityDisabled = state.status === "active" && details.disabled;
      this.syncDisabled();
      if (this.labelOwned) button.textContent = details.label;
      if (!this.managedAttributes.isAuthored(button, "aria-label")) {
        this.managedAttributes.set(button, "aria-label", details.label);
      }
    }

    private syncDisabled() {
      if (!this.button) return;
      if (
        !this.disabledPropertyWrapped &&
        !this.managedAttributes.isManaged(this.button, "disabled")
      ) {
        this.consumerDisabled =
          this.button.disabled ||
          this.button.getAttribute("aria-disabled") === "true" ||
          this.button.getAttribute("data-glow-tour-consumer-disabled") === "true";
      }
      const disabled = this.effectiveDisabled();
      this.managedAttributes.capture(this.button, "disabled");
      this.syncingDisabled = true;
      try {
        this.button.disabled = disabled;
        this.managedAttributes.note(this.button, "disabled");
        if (!this.managedAttributes.isAuthored(this.button, "aria-disabled")) {
          this.managedAttributes.set(this.button, "aria-disabled", String(disabled));
        }
        if (!this.managedAttributes.isAuthored(this.button, "data-glow-tour-consumer-disabled")) {
          this.managedAttributes.set(
            this.button,
            "data-glow-tour-consumer-disabled",
            this.consumerDisabled ? "true" : null,
          );
        }
      } finally {
        this.syncingDisabled = false;
      }
    }

    private effectiveDisabled() {
      return this.capabilityDisabled || this.consumerDisabled;
    }

    private trackConsumerDisabled() {
      const button = this.button;
      if (!button) return;
      const originalDisabled = Object.getOwnPropertyDescriptor(button, "disabled");
      const originalSetAttribute = Object.getOwnPropertyDescriptor(button, "setAttribute");
      const originalRemoveAttribute = Object.getOwnPropertyDescriptor(button, "removeAttribute");
      let prototype: object | null = Object.getPrototypeOf(button);
      let inheritedDisabled: PropertyDescriptor | undefined;
      while (prototype && !inheritedDisabled) {
        inheritedDisabled = Object.getOwnPropertyDescriptor(prototype, "disabled");
        prototype = Object.getPrototypeOf(prototype);
      }
      const descriptor = originalDisabled ?? inheritedDisabled;
      const setAttribute = button.setAttribute;
      const removeAttribute = button.removeAttribute;
      const restores: (() => void)[] = [];
      if (descriptor?.get && descriptor.set && originalDisabled?.configurable !== false) {
        const disabledWrapper: PropertyDescriptor = {
          configurable: true,
          get: () => descriptor.get?.call(button),
          set: (value: boolean) => {
            descriptor.set?.call(button, value);
            if (this.syncingDisabled) return;
            if (this.status === "starting" || this.status === "transitioning") return;
            this.setConsumerDisabled(Boolean(value));
          },
        };
        Object.defineProperty(button, "disabled", disabledWrapper);
        this.disabledPropertyWrapped = true;
        restores.push(() =>
          restoreDescriptor(button, "disabled", originalDisabled, disabledWrapper),
        );
      }
      if (originalRemoveAttribute?.configurable !== false) {
        const removeAttributeWrapper: PropertyDescriptor = {
          configurable: true,
          value: (name: string) => {
            removeAttribute.call(button, name);
            if (name === "disabled" && !this.syncingDisabled) this.setConsumerDisabled(false);
            if (name === "aria-disabled" && !this.syncingDisabled) this.setConsumerDisabled(false);
          },
        };
        Object.defineProperty(button, "removeAttribute", removeAttributeWrapper);
        restores.push(() =>
          restoreDescriptor(
            button,
            "removeAttribute",
            originalRemoveAttribute,
            removeAttributeWrapper,
          ),
        );
      }
      if (originalSetAttribute?.configurable !== false) {
        const setAttributeWrapper: PropertyDescriptor = {
          configurable: true,
          value: (name: string, value: string) => {
            setAttribute.call(button, name, value);
            if (name === "disabled" && !this.syncingDisabled) this.setConsumerDisabled(true);
            if (name === "aria-disabled" && !this.syncingDisabled) {
              this.setConsumerDisabled(value === "true");
            }
          },
        };
        Object.defineProperty(button, "setAttribute", setAttributeWrapper);
        restores.push(() =>
          restoreDescriptor(button, "setAttribute", originalSetAttribute, setAttributeWrapper),
        );
      }
      this.restoreDisabledTracking = () => {
        for (const restore of restores) restore();
        this.disabledPropertyWrapped = false;
      };
      this.disabledObserver = new MutationObserver((records) => {
        if (!this.button || this.syncingDisabled) return;
        this.managedAttributes.relinquishChanged(this.button);
        if (
          records.some((record) => record.attributeName === "aria-disabled") &&
          this.managedAttributes.isAuthored(this.button, "aria-disabled")
        ) {
          this.setConsumerDisabled(this.button.getAttribute("aria-disabled") === "true");
          return;
        }
        if (
          records.some((record) => record.attributeName === "aria-disabled") &&
          this.button.disabled === this.effectiveDisabled()
        ) {
          return;
        }
        this.setConsumerDisabled(this.button.disabled);
      });
      this.disabledObserver.observe(button, {
        attributeFilter: ["aria-disabled", "disabled"],
        attributes: true,
      });
    }

    private setConsumerDisabled(disabled: boolean) {
      if (!this.button) return;
      this.consumerDisabled = disabled;
      this.syncDisabled();
    }

    protected abstract details(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ): { disabled: boolean; hidden: boolean; label: string };
  }

  class GlowTourBackTrigger extends GlowTourTrigger {
    protected readonly action = "previous" as const;

    protected details(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      return {
        disabled: !state.canGoPrevious || props.disablePreviousButton === true,
        hidden: props.hidePreviousButton === true,
        label: this.getAttribute("back-label") ?? "Back step",
      };
    }
  }

  class GlowTourNextTrigger extends GlowTourTrigger {
    protected readonly action = "next" as const;

    protected details(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      return {
        disabled: !state.canGoNext || props.disableNextButton === true,
        hidden: props.hideNextButton === true,
        label: state.isLastStep
          ? (this.getAttribute("finish-label") ?? "Finish tour")
          : (this.getAttribute("next-label") ?? "Next step"),
      };
    }
  }

  class GlowTourCancelTrigger extends GlowTourTrigger {
    protected readonly action = "cancel" as const;

    protected details(
      state: TourState<VanillaTourContent>,
      _props: DynamicStepProps<VanillaTourContent>,
    ) {
      return {
        disabled: !state.canCancel,
        hidden: !state.canCancel,
        label: "Cancel tour",
      };
    }
  }

  const definitions: Record<(typeof GLOW_TOUR_ELEMENT_NAMES)[number], CustomElementConstructor> = {
    "glow-tour-root": GlowTourRoot,
    "glow-tour-header": GlowTourHeader,
    "glow-tour-content": GlowTourContent,
    "glow-tour-footer": GlowTourFooter,
    "glow-tour-popover": GlowTourPopover,
    "glow-tour-pointer": GlowTourPointer,
    "glow-tour-back-trigger": GlowTourBackTrigger,
    "glow-tour-next-trigger": GlowTourNextTrigger,
    "glow-tour-cancel-trigger": GlowTourCancelTrigger,
    "glow-tour-overlay": GlowTourOverlay,
  };
  for (const name of GLOW_TOUR_ELEMENT_NAMES) {
    if (!customElements.get(name)) customElements.define(name, definitions[name]);
  }
}
