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

const ROOT_CONTEXT = Symbol("glow-tour-root-context");
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

function canRegisterCustomElements() {
  return typeof customElements !== "undefined" && typeof HTMLElement !== "undefined";
}

function rootContext(root: HTMLElement): RootContext | null {
  const context: unknown = Reflect.get(root, ROOT_CONTEXT);
  if (typeof context !== "object" || context === null) return null;
  return context as RootContext;
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

function releaseGeneratedAttributes(root: HTMLElement, ids: RootBinding["ids"]) {
  for (const element of ownedElements(root, "[data-glow-tour-header]")) {
    if (element.id === ids.title) element.removeAttribute("id");
  }
  for (const element of ownedElements(root, "[data-glow-tour-content]")) {
    if (element.id === ids.description) element.removeAttribute("id");
  }
  for (const element of ownedElements(root, "[data-glow-tour-popover]")) {
    if (element.id === ids.popover) element.removeAttribute("id");
    if (element.getAttribute("aria-describedby") === ids.description) {
      element.removeAttribute("aria-describedby");
    }
    if (element.getAttribute("aria-labelledby") === ids.title) {
      element.removeAttribute("aria-labelledby");
    }
  }
  for (const element of ownedElements(root, "[aria-controls]")) {
    if (element.getAttribute("aria-controls") === ids.popover)
      element.removeAttribute("aria-controls");
  }
}

export function registerGlowTourElements() {
  if (!canRegisterCustomElements()) return;

  class GlowTourRoot extends HTMLElement implements GlowTourRootElement {
    private active: ActiveRootBinding | null = null;
    private connected = false;
    private pending = false;
    private currentTour: VanillaGlowTour | null = null;

    get tour() {
      return this.currentTour;
    }

    set tour(value: VanillaGlowTour | null) {
      if (this.currentTour === value) return;
      this.currentTour = value;
      this.reconcileSoon();
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
      this.connected = true;
      this.setAttribute("data-glow-tour-root", "");
      this.reconcile();
    }

    disconnectedCallback() {
      this.connected = false;
      this.pending = false;
      this.release();
    }

    attributeChangedCallback(name: string) {
      if (name === "id-prefix") this.reconcileSoon();
    }

    private reconcileSoon() {
      if (!this.connected) return;
      if (!this.active) {
        this.reconcile();
        return;
      }
      if (this.pending) return;
      this.pending = true;
      queueMicrotask(() => {
        this.pending = false;
        this.reconcile();
      });
    }

    private reconcile() {
      if (!this.connected) return;
      const tour = this.currentTour;
      const idPrefix = this.idPrefix;
      const current = this.active;
      if (current?.tour === tour && current.idPrefix === idPrefix) return;
      this.release();
      if (current && this.id === current.binding.ids.root) this.removeAttribute("id");
      if (!tour) {
        this.notify();
        return;
      }
      const binding = getAdapterBridge(tour).connectRoot({
        adapter: vanillaAdapter,
        idPrefix,
        root: this,
      });
      this.active = { binding, idPrefix, tour };
      this.notify();
    }

    private release() {
      const active = this.active;
      if (!active) return;
      this.active = null;
      releaseGeneratedAttributes(this, active.binding.ids);
      active.binding.release();
      this.notify();
    }

    private notify() {
      this.dispatchEvent(new Event(ROOT_CHANGE_EVENT));
    }

    constructor() {
      super();
      Object.defineProperty(this, ROOT_CONTEXT, {
        configurable: false,
        enumerable: false,
        get: (): RootContext => ({ binding: this.active?.binding ?? null, tour: this.currentTour }),
      });
    }
  }

  abstract class ScopedElement extends HTMLElement {
    private cleanup?: () => void;
    private root?: GlowTourRootElement;

    connectedCallback() {
      this.rebind();
    }

    disconnectedCallback() {
      this.cleanup?.();
      this.cleanup = undefined;
      this.root?.removeEventListener(ROOT_CHANGE_EVENT, this.rebind);
      this.root = undefined;
    }

    protected readonly rebind = () => {
      this.cleanup?.();
      this.cleanup = undefined;
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
      return subscribeToCurrentStep(context.tour, (state, props) => this.render(state, props));
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
      const binding = rootContext(closestRoot(this) as HTMLElement)?.binding;
      if (binding) this.id = binding.ids.title;
      renderValue(this, props.title);
    }
  }

  class GlowTourContent extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("aria-live", "polite");
      this.setAttribute("data-glow-tour-content", "");
      super.connectedCallback();
    }

    protected render(
      _state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const binding = rootContext(closestRoot(this) as HTMLElement)?.binding;
      if (binding) this.id = binding.ids.description;
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
      this.setAttribute("role", "dialog");
      if (!this.hasAttribute("tabindex")) this.tabIndex = -1;
      super.connectedCallback();
    }

    protected override bind(context: RootContext) {
      if (!context.binding) return;
      this.id = context.binding.ids.popover;
      this.setAttribute("aria-describedby", context.binding.ids.description);
      this.setAttribute("aria-labelledby", context.binding.ids.title);
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
    protected abstract readonly action: "back" | "cancel" | "next";
    private button?: HTMLButtonElement;
    private ownsLabel = false;
    private ownsAriaLabel = false;
    private capabilityDisabled = false;
    private managedDisabled = false;
    private consumerDisabled = false;
    private syncingDisabled = false;
    private restoreDisabledTracking?: () => void;

    connectedCallback() {
      this.button =
        this.querySelector<HTMLButtonElement>("button") ?? document.createElement("button");
      this.ownsLabel = this.button.childNodes.length === 0;
      this.ownsAriaLabel = !this.button.hasAttribute("aria-label");
      this.consumerDisabled =
        this.button.disabled || this.button.getAttribute("aria-disabled") === "true";
      if (!this.button.parentElement) this.appendChild(this.button);
      this.button.type = "button";
      this.button.setAttribute(`data-glow-tour-${this.action}-trigger`, "");
      if (this.consumerDisabled)
        this.button.setAttribute("data-glow-tour-consumer-disabled", "true");
      this.trackConsumerDisabled();
      super.connectedCallback();
    }

    override disconnectedCallback() {
      this.restoreDisabledTracking?.();
      this.restoreDisabledTracking = undefined;
      super.disconnectedCallback();
    }

    protected render(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const binding = rootContext(closestRoot(this) as HTMLElement)?.binding;
      const button = this.button;
      if (!binding || !button) return;
      button.setAttribute("aria-controls", binding.ids.popover);
      const details = this.details(state, props);
      this.hidden = details.hidden;
      this.capabilityDisabled = details.disabled;
      this.syncDisabled();
      if (this.ownsLabel) button.textContent = details.label;
      if (this.ownsAriaLabel) button.setAttribute("aria-label", details.label);
    }

    private syncDisabled() {
      if (!this.button) return;
      this.managedDisabled = this.capabilityDisabled || this.consumerDisabled;
      this.syncingDisabled = true;
      this.button.disabled = this.managedDisabled;
      this.syncingDisabled = false;
      this.button.setAttribute("aria-disabled", String(this.managedDisabled));
      if (this.consumerDisabled) {
        this.button.setAttribute("data-glow-tour-consumer-disabled", "true");
      } else {
        this.button.removeAttribute("data-glow-tour-consumer-disabled");
      }
    }

    private trackConsumerDisabled() {
      const button = this.button;
      if (!button) return;
      let prototype: object | null = Object.getPrototypeOf(button);
      let descriptor: PropertyDescriptor | undefined;
      while (prototype && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, "disabled");
        prototype = Object.getPrototypeOf(prototype);
      }
      if (!descriptor?.get || !descriptor.set) return;
      Object.defineProperty(button, "disabled", {
        configurable: true,
        get: () => descriptor.get?.call(button),
        set: (value: boolean) => {
          descriptor.set?.call(button, value);
          if (this.syncingDisabled || this.capabilityDisabled) return;
          this.consumerDisabled = Boolean(value);
          this.syncDisabled();
        },
      });
      this.restoreDisabledTracking = () => Reflect.deleteProperty(button, "disabled");
    }

    protected abstract details(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ): { disabled: boolean; hidden: boolean; label: string };
  }

  class GlowTourBackTrigger extends GlowTourTrigger {
    protected readonly action = "back" as const;

    protected details(
      state: TourState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      return {
        disabled: !state.canPrevious || props.disableBackButton === true,
        hidden: state.isFirstStep || props.hideBackButton === true,
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
        disabled: !state.canAdvance || props.disableNextButton === true,
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
        label: this.getAttribute("cancel-label") ?? "Cancel tour",
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
