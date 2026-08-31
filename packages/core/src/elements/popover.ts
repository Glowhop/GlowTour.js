import type { ResolvedPlacement, TryOrderOptions } from "../types";
import { roundByDPR, toggleElementAttribute, viewportDimensions } from "../utils/utils";
import GlowTourElement, { type TourElementStep } from "./base";
import { ensurePopoverArrowStyles } from "./popover-arrow-styles";

const DEFAULT_POPOVER_GAP = 14;
const DEFAULT_ARROW_EDGE_PADDING = 16;
const DEFAULT_TRY_ORDER = ["bottom", "top", "right", "left"] as const;
const REPLACEMENT_DIFF = 50; // pixels

export interface PopoverPosition {
  placement: ResolvedPlacement;
  x: number;
  y: number;
  arrowOffset: number | null;
}

interface PendingReposition {
  readonly position: DOMRect;
  readonly step: TourElementStep;
}

interface InlineStyleSnapshot {
  readonly priority: string;
  readonly value: string;
}

const ARROW_STYLE_PROPERTIES = {
  borderRadius: "--glow-tour-arrow-border-radius",
  borderWidth: "--glow-tour-arrow-border-width",
  color: "--glow-tour-arrow-color",
  size: "--glow-tour-arrow-size",
} as const;

export default class PopoverElement<T> extends GlowTourElement<T> {
  private appliedPosition: PopoverPosition | null = null;
  private pendingReposition: PendingReposition | null = null;
  private repositionPhase: "idle" | "fading-out" | "fading-in" = "idle";
  private repositionGeneration = 0;
  private readonly originalArrowStyles = new Map<string, InlineStyleSnapshot>();
  private readonly overriddenArrowStyles = new Set<string>();

  protected _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe {
    this._applyArrowStyles(step);
    const nextPosition = this.resolvePosition(position, step);
    this._applyPositionState(nextPosition);
    this.appliedPosition = nextPosition;

    return {
      transform: `translate(${roundByDPR(nextPosition.x)}px, ${roundByDPR(nextPosition.y)}px)`,
    };
  }

  resolvePosition(targetPosition: DOMRect, step: TourElementStep): PopoverPosition {
    const currentElement = this.getElement();
    if (!currentElement) {
      return {
        placement: "center",
        x: 0,
        y: 0,
        arrowOffset: null,
      };
    }

    const gap = Math.max(0, step.popover?.gap ?? DEFAULT_POPOVER_GAP);
    const arrowDisabled = step.popover?.arrow?.disabled === true;
    const arrowEdgePadding = step.popover?.arrow?.edgePadding ?? DEFAULT_ARROW_EDGE_PADDING;

    const popoverPosition = currentElement.getBoundingClientRect();
    const viewport = viewportDimensions();
    const minX = gap;
    const maxX = viewport.width - gap - popoverPosition.width;
    const minY = gap;
    const maxY = viewport.height - gap - popoverPosition.height;
    const targetCenterX = targetPosition.left + targetPosition.width / 2;
    const targetCenterY = targetPosition.top + targetPosition.height / 2;

    if (maxX < minX || maxY < minY) {
      return this._centerPosition(popoverPosition, viewport);
    }

    const centeredX = targetCenterX - popoverPosition.width / 2;
    const centeredY = targetCenterY - popoverPosition.height / 2;
    const candidates: Record<TryOrderOptions, { x: number; y: number }> = {
      top: {
        x: clamp(centeredX, minX, maxX),
        y: targetPosition.top - popoverPosition.height - gap,
      },
      bottom: {
        x: clamp(centeredX, minX, maxX),
        y: targetPosition.bottom + gap,
      },
      left: {
        x: targetPosition.left - popoverPosition.width - gap,
        y: clamp(centeredY, minY, maxY),
      },
      right: {
        x: targetPosition.right + gap,
        y: clamp(centeredY, minY, maxY),
      },
    };

    const tryOrder = step.popover?.placementTryOrder ?? DEFAULT_TRY_ORDER;

    for (const placement of tryOrder) {
      const candidate = candidates[placement];
      const isVisible =
        candidate.x >= minX &&
        candidate.y >= minY &&
        candidate.x + popoverPosition.width <= viewport.width - gap &&
        candidate.y + popoverPosition.height <= viewport.height - gap;

      if (!isVisible) {
        continue;
      }

      const arrowOffset = arrowDisabled
        ? null
        : placement === "top" || placement === "bottom"
          ? targetCenterX - candidate.x
          : targetCenterY - candidate.y;
      const arrowAxisSize =
        placement === "top" || placement === "bottom"
          ? popoverPosition.width
          : popoverPosition.height;

      if (
        arrowOffset !== null &&
        (arrowOffset < arrowEdgePadding || arrowOffset > arrowAxisSize - arrowEdgePadding)
      ) {
        continue;
      }

      return { ...candidate, arrowOffset, placement };
    }

    return this._centerPosition(popoverPosition, viewport);
  }

  private _centerPosition(
    popoverPosition: DOMRect,
    viewport: { width: number; height: number },
  ): PopoverPosition {
    return {
      arrowOffset: null,
      placement: "center",
      x: (viewport.width - popoverPosition.width) / 2,
      y: (viewport.height - popoverPosition.height) / 2,
    };
  }

  private _applyPositionState(position: PopoverPosition) {
    if (this.element.getAttribute("data-glow-tour-placement") !== position.placement) {
      this.element.setAttribute("data-glow-tour-placement", position.placement);
    }
    const arrowHidden = position.arrowOffset === null;
    if (this.element.hasAttribute("data-glow-tour-arrow-hidden") !== arrowHidden) {
      toggleElementAttribute(this.element, "data-glow-tour-arrow-hidden", arrowHidden);
    }
    if (position.arrowOffset === null) {
      if (this.element.style.getPropertyValue("--glow-tour-arrow-offset")) {
        this.element.style.removeProperty("--glow-tour-arrow-offset");
      }
    } else {
      const arrowOffset = `${roundByDPR(position.arrowOffset)}px`;
      if (this.element.style.getPropertyValue("--glow-tour-arrow-offset") !== arrowOffset) {
        this.element.style.setProperty("--glow-tour-arrow-offset", arrowOffset);
      }
    }
  }

  async moveToTarget(
    nextPosition: DOMRect,
    step: TourElementStep,
    appear: boolean,
    onChange?: () => void | Promise<void>,
  ) {
    if (!appear) {
      await this._disappear();
    }

    if (onChange) await onChange();

    await this._appear(nextPosition, step);
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      console.warn("No popover element found");
      return;
    }

    ensurePopoverArrowStyles(el);

    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "10001");
    el.style.setProperty("top", "0px");
    el.style.setProperty("left", "0px");
    el.style.setProperty("opacity", "0");
    el.style.setProperty("transform-origin", "center center");
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
    }
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("inert", "true");
    // el.style.setProperty("transform", "translate(0px, 0px)");
  }

  updatePosition(nextPosition: DOMRect, step: TourElementStep): ResolvedPlacement {
    const nextCoordinates = this.resolvePosition(nextPosition, step);
    const appliedPosition = this.appliedPosition;
    if (!appliedPosition) {
      this._applyPositionState(nextCoordinates);
      this.appliedPosition = nextCoordinates;
      this._applyTransform(nextCoordinates);
      return nextCoordinates.placement;
    }
    if (this.repositionPhase === "fading-out") {
      this.pendingReposition = { position: nextPosition, step };
      return nextCoordinates.placement;
    }
    const shouldReposition =
      appliedPosition.placement !== nextCoordinates.placement ||
      Math.abs(nextCoordinates.x - appliedPosition.x) > REPLACEMENT_DIFF ||
      Math.abs(nextCoordinates.y - appliedPosition.y) > REPLACEMENT_DIFF;
    if (shouldReposition) {
      this.pendingReposition = { position: nextPosition, step };
      if (this.repositionPhase === "idle") void this._flushReposition();
    } else if (this.repositionPhase === "fading-in") {
      this.pendingReposition = null;
    } else {
      const stationaryPosition = this._stationaryPosition(
        appliedPosition,
        nextCoordinates,
        nextPosition,
        step,
      );
      this._applyPositionState(stationaryPosition);
      this.appliedPosition = stationaryPosition;
    }
    return nextCoordinates.placement;
  }

  override cancelAnimations() {
    this.repositionGeneration += 1;
    this.pendingReposition = null;
    this.repositionPhase = "idle";
    super.cancelAnimations();
  }

  private async _flushReposition() {
    if (this.repositionPhase !== "idle") return;
    const generation = ++this.repositionGeneration;
    try {
      while (this.pendingReposition && generation === this.repositionGeneration) {
        let pending = this.pendingReposition;
        this.pendingReposition = null;
        this.repositionPhase = "fading-out";
        await this._disappear();
        if (generation !== this.repositionGeneration || !this.getElement()) return;
        pending = this.pendingReposition ?? pending;
        this.pendingReposition = null;
        this.repositionPhase = "fading-in";
        await this._appear(pending.position, pending.step);
      }
    } finally {
      if (generation === this.repositionGeneration) this.repositionPhase = "idle";
    }
  }

  private _applyTransform(position: PopoverPosition) {
    const transform = `translate(${roundByDPR(position.x)}px, ${roundByDPR(position.y)}px)`;
    if (this.element.style.transform !== transform) {
      this.element.style.setProperty("transform", transform);
    }
  }

  private _stationaryPosition(
    appliedPosition: PopoverPosition,
    nextPosition: PopoverPosition,
    targetPosition: DOMRect,
    step: TourElementStep,
  ): PopoverPosition {
    if (nextPosition.arrowOffset === null) {
      return { ...appliedPosition, arrowOffset: null };
    }
    const popoverRect = this.element.getBoundingClientRect();
    const horizontal =
      appliedPosition.placement === "top" || appliedPosition.placement === "bottom";
    const targetCenter = horizontal
      ? targetPosition.left + targetPosition.width / 2
      : targetPosition.top + targetPosition.height / 2;
    const popoverStart = horizontal ? appliedPosition.x : appliedPosition.y;
    const popoverSize = horizontal ? popoverRect.width : popoverRect.height;
    const arrowEdgePadding = step.popover?.arrow?.edgePadding ?? DEFAULT_ARROW_EDGE_PADDING;
    return {
      ...appliedPosition,
      arrowOffset: clamp(
        targetCenter - popoverStart,
        arrowEdgePadding,
        Math.max(arrowEdgePadding, popoverSize - arrowEdgePadding),
      ),
    };
  }

  private _applyArrowStyles(step: TourElementStep) {
    const arrow = step.popover?.arrow;
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.color, arrow?.color);
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.size, toPixels(arrow?.size));
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.borderWidth, toPixels(arrow?.borderWidth));
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.borderRadius, toPixels(arrow?.borderRadius));
  }

  private _applyArrowStyle(property: string, value: string | undefined) {
    if (value === undefined) {
      this._restoreArrowStyle(property);
      return;
    }
    if (!this.overriddenArrowStyles.has(property)) {
      this.originalArrowStyles.set(property, {
        priority: this.element.style.getPropertyPriority(property),
        value: this.element.style.getPropertyValue(property),
      });
      this.overriddenArrowStyles.add(property);
    }
    if (
      this.element.style.getPropertyValue(property) !== value ||
      this.element.style.getPropertyPriority(property)
    ) {
      this.element.style.setProperty(property, value);
    }
  }

  private _restoreArrowStyle(property: string) {
    if (!this.overriddenArrowStyles.delete(property)) return;
    const original = this.originalArrowStyles.get(property);
    this.originalArrowStyles.delete(property);
    if (original?.value) {
      this.element.style.setProperty(property, original.value, original.priority);
    } else {
      this.element.style.removeProperty(property);
    }
  }

  private _restoreArrowStyles() {
    for (const property of [...this.overriddenArrowStyles]) this._restoreArrowStyle(property);
  }

  async _appear(position: DOMRect, step: TourElementStep) {
    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      value != null && this.element.style.setProperty(key, String(value));
    }

    const animation = this._startAnimation(
      [
        {
          opacity: 1,
        },
      ],
      this._getAnimationOptions(),
    );
    if (animation && !(await this._waitForAnimation(animation))) return;

    this._applyVisibleState();
  }

  async _disappear() {
    const animation = this._startAnimation(
      {
        opacity: 0,
      },
      this._getAnimationOptions(),
    );

    if (animation && !(await this._waitForAnimation(animation))) return;

    this._applyHiddenState();
  }

  protected _release() {
    this._restoreArrowStyles();
    this._applyHiddenState();
  }

  private _applyVisibleState() {
    this.element.style.setProperty("opacity", "1");
    this.element.removeAttribute("aria-hidden");
    this.element.removeAttribute("inert");
  }

  private _applyHiddenState() {
    this.element.style.setProperty("opacity", "0");
    this.element.setAttribute("aria-hidden", "true");
    this.element.setAttribute("inert", "true");
    this.element.style.removeProperty("transform");
  }
}

function toPixels(value: number | undefined) {
  return value === undefined ? undefined : `${Math.max(0, value)}px`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
