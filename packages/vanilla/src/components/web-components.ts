import type { DynamicStepProps, WorkflowState } from "@glowhop/core-tour";
import type { VanillaTourContent } from "../glow-tour";
import { glowTour } from "../glow-tour";

export const GLOW_TOUR_ELEMENT_NAMES = [
  "glow-tour-root",
  "glow-tour-header",
  "glow-tour-content",
  "glow-tour-footer",
  "glow-tour-popover",
  "glow-tour-pointer",
  "glow-tour-back-trigger",
  "glow-tour-next-trigger",
  "glow-tour-overlay",
] as const;

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

function canRegisterCustomElements() {
  return typeof customElements !== "undefined" && typeof HTMLElement !== "undefined";
}

function subscribeToCurrentStep(
  listener: (
    state: WorkflowState<VanillaTourContent>,
    props: DynamicStepProps<VanillaTourContent>,
  ) => void,
) {
  let state = glowTour.state.get();
  let stepCleanup: (() => void) | undefined;

  const bindStep = (nextState: WorkflowState<VanillaTourContent>) => {
    state = nextState;
    stepCleanup?.();
    stepCleanup = undefined;
    const step = state.currentStep;
    if (!step) {
      listener(state, { content: "", title: "" });
      return;
    }
    listener(state, step.currentProps.get());
    stepCleanup = step.currentProps.subscribe((props) => listener(state, props));
  };

  bindStep(state);
  const stateCleanup = glowTour.state.subscribe(bindStep);
  return () => {
    stepCleanup?.();
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

function setDefaultAttribute(element: HTMLElement, name: string, value: string) {
  if (!element.hasAttribute(name)) element.setAttribute(name, value);
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

export function registerGlowTourElements() {
  if (!canRegisterCustomElements()) return;

  class GlowTourRootElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-root", "");
    }
  }

  abstract class ReactiveElement extends HTMLElement {
    private cleanup?: () => void;

    protected connect(
      listener: (
        state: WorkflowState<VanillaTourContent>,
        props: DynamicStepProps<VanillaTourContent>,
      ) => void,
    ) {
      this.cleanup?.();
      this.cleanup = subscribeToCurrentStep(listener);
    }

    disconnectedCallback() {
      this.cleanup?.();
      this.cleanup = undefined;
    }
  }

  class GlowTourHeaderElement extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-header", "");
      setDefaultAttribute(this, "id", TITLE_ID);
      this.connect((_state, props) => renderValue(this, props.title));
    }
  }

  class GlowTourContentElement extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-content", "");
      setDefaultAttribute(this, "id", DESCRIPTION_ID);
      setDefaultAttribute(this, "aria-live", "polite");
      this.connect((_state, props) => renderValue(this, props.content));
    }
  }

  class GlowTourFooterElement extends ReactiveElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-footer", "");
      this.connect((_state, props) => {
        this.hidden = props.hideFooter === true;
      });
    }
  }

  class GlowTourPopoverElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-popover", "");
      setDefaultAttribute(this, "id", POPOVER_ID);
      setDefaultAttribute(this, "role", "dialog");
      setDefaultAttribute(this, "aria-labelledby", TITLE_ID);
      setDefaultAttribute(this, "aria-describedby", DESCRIPTION_ID);
      if (!this.hasAttribute("tabindex")) this.tabIndex = -1;
      glowTour.state.registerElementPopover(this);
    }

    disconnectedCallback() {
      glowTour.state.registerElementPopover(null);
    }
  }

  class GlowTourPointerElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-pointer", "");
      this.setAttribute("aria-hidden", "true");

      if (!this.querySelector(":scope > [data-glow-tour-pointer-content]")) {
        const content = document.createElement("div");
        content.setAttribute("data-glow-tour-pointer-content", "");
        content.append(...Array.from(this.childNodes));
        this.replaceChildren(content);
      }

      glowTour.state.registerElementPointer(this);
    }

    disconnectedCallback() {
      glowTour.state.registerElementPointer(null);
    }
  }

  class GlowTourOverlayElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute("data-glow-tour-overlay-host", "");
      glowTour.state.registerElementOverlay(createOverlaySvg(this));
    }

    disconnectedCallback() {
      glowTour.state.registerElementOverlay(null);
    }
  }

  abstract class GlowTourTriggerElement extends ReactiveElement {
    protected abstract readonly action: "back" | "next";
    private button?: HTMLButtonElement;
    private ownsLabel = false;
    private clickCleanup?: () => void;

    connectedCallback() {
      this.button =
        this.querySelector<HTMLButtonElement>("button") ?? document.createElement("button");
      this.ownsLabel = this.button.childNodes.length === 0;
      if (!this.button.parentElement) this.appendChild(this.button);
      this.button.type = "button";
      this.button.setAttribute("data-action", this.action);
      this.button.setAttribute(`data-glow-tour-${this.action}-trigger`, "");
      setDefaultAttribute(this.button, "aria-controls", POPOVER_ID);
      setDefaultAttribute(
        this.button,
        "aria-keyshortcuts",
        this.action === "back" ? "ArrowLeft" : "Enter ArrowRight",
      );
      const click = (event: Event) => {
        event.preventDefault();
        void glowTour.state[this.action]();
      };
      this.button.addEventListener("click", click);
      this.clickCleanup = () => this.button?.removeEventListener("click", click);
      this.connect((state, props) => this.syncButton(state, props));
    }

    protected abstract syncButton(
      state: WorkflowState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ): void;

    protected updateButton(options: { disabled: boolean; hidden: boolean; label: string }) {
      this.hidden = options.hidden;
      if (!this.button) return;
      this.button.disabled = options.disabled;
      if (this.ownsLabel) this.button.textContent = options.label;
      setDefaultAttribute(this.button, "aria-label", options.label);
    }

    override disconnectedCallback() {
      this.clickCleanup?.();
      this.clickCleanup = undefined;
      super.disconnectedCallback();
    }
  }

  class GlowTourBackTriggerElement extends GlowTourTriggerElement {
    protected readonly action = "back" as const;

    protected syncButton(
      state: WorkflowState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      this.updateButton({
        disabled: !state.canGoBack || props.disableBackButton === true,
        hidden: state.isFirstStep || props.hideBackButton === true,
        label:
          this.getAttribute("back-label") ??
          state.startOptions.popover?.buttons?.backLabel ??
          "Back step",
      });
    }
  }

  class GlowTourNextTriggerElement extends GlowTourTriggerElement {
    protected readonly action = "next" as const;

    protected syncButton(
      state: WorkflowState<VanillaTourContent>,
      props: DynamicStepProps<VanillaTourContent>,
    ) {
      const labels = state.startOptions.popover?.buttons;
      this.updateButton({
        disabled: !state.canGoNext || props.disableNextButton === true,
        hidden: props.hideNextButton === true,
        label: state.isLastStep
          ? (this.getAttribute("finish-label") ?? labels?.finishLabel ?? "Finish tour")
          : (this.getAttribute("next-label") ?? labels?.nextLabel ?? "Next step"),
      });
    }
  }

  const definitions: Record<(typeof GLOW_TOUR_ELEMENT_NAMES)[number], CustomElementConstructor> = {
    "glow-tour-root": GlowTourRootElement,
    "glow-tour-header": GlowTourHeaderElement,
    "glow-tour-content": GlowTourContentElement,
    "glow-tour-footer": GlowTourFooterElement,
    "glow-tour-popover": GlowTourPopoverElement,
    "glow-tour-pointer": GlowTourPointerElement,
    "glow-tour-back-trigger": GlowTourBackTriggerElement,
    "glow-tour-next-trigger": GlowTourNextTriggerElement,
    "glow-tour-overlay": GlowTourOverlayElement,
  };

  for (const name of GLOW_TOUR_ELEMENT_NAMES) {
    if (!customElements.get(name)) customElements.define(name, definitions[name]);
  }
}
