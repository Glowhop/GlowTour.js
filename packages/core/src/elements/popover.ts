import type { ResolvedPlacement, TryOrderOptions } from "../types";
import { DomMutationLease } from "../dom/dom-mutation-lease";
import { roundByDPR, viewportDimensions } from "../utils/utils";
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

const ARROW_STYLE_PROPERTIES = {
  borderRadius: "--glow-tour-arrow-border-radius",
  borderWidth: "--glow-tour-arrow-border-width",
  color: "--glow-tour-arrow-color",
  size: "--glow-tour-arrow-size",
} as const;

export default class PopoverElement extends GlowTourElement {
  private appliedPosition: PopoverPosition | null = null;
  private pendingReposition: PendingReposition | null = null;
  private repositionPhase: "idle" | "fading-out" | "fading-in" = "idle";
  private repositionGeneration = 0;
  private readonly mutationLease = new DomMutationLease(this.element);

  protected _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe {
    this._applyArrowStyles(step);
    const nextPosition = this.resolvePosition(position, step);
    this._applyPositionState(nextPosition);
    this.appliedPosition = nextPosition;

    return {
      transform: `translate(${roundByDPR(nextPosition.x, this.element)}px, ${roundByDPR(nextPosition.y, this.element)}px)`,
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
    const viewport = viewportDimensions(currentElement);
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
      this.mutationLease.setAttribute("data-glow-tour-placement", position.placement);
    }
    const arrowHidden = position.arrowOffset === null;
    if (this.element.hasAttribute("data-glow-tour-arrow-hidden") !== arrowHidden) {
      this.mutationLease.setAttribute("data-glow-tour-arrow-hidden", arrowHidden ? "" : null);
    }
    if (position.arrowOffset === null) {
      if (this.element.style.getPropertyValue("--glow-tour-arrow-offset")) {
        this.mutationLease.setStyle("--glow-tour-arrow-offset", null);
      }
    } else {
      const arrowOffset = `${roundByDPR(position.arrowOffset, this.element)}px`;
      if (this.element.style.getPropertyValue("--glow-tour-arrow-offset") !== arrowOffset) {
        this.mutationLease.setStyle("--glow-tour-arrow-offset", arrowOffset);
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

    this.mutationLease.setStyle("position", "fixed");
    this.mutationLease.setStyle("z-index", "10001");
    this.mutationLease.setStyle("top", "0px");
    this.mutationLease.setStyle("left", "0px");
    this.mutationLease.setStyle("opacity", "0");
    this.mutationLease.setStyle("transform-origin", "center center");
    if (!el.hasAttribute("tabindex")) {
      this.mutationLease.setAttribute("tabindex", "-1");
    }
    this.mutationLease.setAttribute("aria-hidden", "true");
    this.mutationLease.setAttribute("inert", "true");
  }

  updatePosition(
    nextPosition: DOMRect,
    step: TourElementStep,
    onReposition?: (reposition: Promise<void>) => void,
  ): ResolvedPlacement {
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
      if (this.repositionPhase === "idle") {
        const reposition = this._flushReposition();
        if (onReposition) onReposition(reposition);
        else void reposition.catch(() => {});
      }
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
    const transform = `translate(${roundByDPR(position.x, this.element)}px, ${roundByDPR(position.y, this.element)}px)`;
    if (this.element.style.transform !== transform) {
      this.mutationLease.setStyle("transform", transform);
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
    ensurePopoverArrowStyles(this.element, {
      disabled: arrow?.disableAutoStyles,
      nonce: arrow?.styleNonce,
    });
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.color, arrow?.color);
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.size, toPixels(arrow?.size));
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.borderWidth, toPixels(arrow?.borderWidth));
    this._applyArrowStyle(ARROW_STYLE_PROPERTIES.borderRadius, toPixels(arrow?.borderRadius));
  }

  private _applyArrowStyle(property: string, value: string | undefined) {
    if (value === undefined) {
      this.mutationLease.releaseStyle(property);
      return;
    }
    if (
      this.element.style.getPropertyValue(property) !== value ||
      this.element.style.getPropertyPriority(property)
    ) {
      this.mutationLease.setStyle(property, value);
    }
  }

  async _appear(position: DOMRect, step: TourElementStep) {
    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      if (value != null) this.mutationLease.setStyle(key, String(value));
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
    this.mutationLease.release();
  }

  private _applyVisibleState() {
    this.mutationLease.setStyle("opacity", "1");
    this.mutationLease.setAttribute("aria-hidden", null);
    this.mutationLease.setAttribute("inert", null);
  }

  private _applyHiddenState() {
    this.mutationLease.setStyle("opacity", "0");
    this.mutationLease.setAttribute("aria-hidden", "true");
    this.mutationLease.setAttribute("inert", "true");
    this.mutationLease.setStyle("transform", null);
  }
}

function toPixels(value: number | undefined) {
  return value === undefined ? undefined : `${Math.max(0, value)}px`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
