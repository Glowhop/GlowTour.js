import type { ResolvedPlacement, TryOrderOptions } from "../types";
import { isInViewport, roundByDPR, viewportDimensions } from "../utils/utils";
import GlowTourElement, { type TourElementStep } from "./base";

const DEFAULT_INDICATOR_GAP = 16;
const POINTER_ANIMATION_DISTANCE = 8;
const POINTER_ANIMATION_DURATION = 800;
const DEFAULT_TRY_ORDER = [
  "left",
  "right",
  "top",
  "bottom",
] as const satisfies readonly TryOrderOptions[];

interface PointerPosition {
  placement: TryOrderOptions;
  x: number;
  y: number;
}

export default class PointerElement<T> extends GlowTourElement<T> {
  private animation: Animation | null = null;
  private popoverPlacement?: ResolvedPlacement;

  initializeProps() {
    this.element.style.setProperty("position", "fixed");
    this.element.style.setProperty("z-index", "10002");
    this.element.style.setProperty("top", "0px");
    this.element.style.setProperty("left", "0px");
    this.element.style.setProperty("opacity", "0");
    this.element.style.setProperty("pointer-events", "none");
    this.element.style.setProperty("will-change", "top, left, transform, opacity");
    this.element.setAttribute("aria-hidden", "true");
  }

  protected _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe {
    const nextPosition = this._resolvePosition(position, step);
    this.element.setAttribute("data-glow-tour-placement", nextPosition.placement);

    return {
      left: `${roundByDPR(nextPosition.x, this.element)}px`,
      top: `${roundByDPR(nextPosition.y, this.element)}px`,
    };
  }

  async moveToTarget(
    nextPosition: DOMRect,
    step: TourElementStep,
    appear: boolean,
    popoverPlacement?: ResolvedPlacement,
  ) {
    this.popoverPlacement = popoverPlacement;
    if (!appear) {
      await this._disappear();
    }
    await this._appear(nextPosition, step);
  }

  updatePosition(
    nextPosition: DOMRect,
    step: TourElementStep,
    popoverPlacement?: ResolvedPlacement,
  ) {
    this.popoverPlacement = popoverPlacement;
    const currentPlacement = this.element.getAttribute("data-glow-tour-placement");
    const nextPositionState = this._resolvePosition(nextPosition, step);
    const nextPlacement = nextPositionState.placement;
    const left = `${roundByDPR(nextPositionState.x, this.element)}px`;
    const top = `${roundByDPR(nextPositionState.y, this.element)}px`;
    if (this.element.style.getPropertyValue("left") !== left) {
      this.element.style.setProperty("left", left);
    }
    if (this.element.style.getPropertyValue("top") !== top) {
      this.element.style.setProperty("top", top);
    }
    if (currentPlacement !== nextPlacement) {
      this.element.setAttribute("data-glow-tour-placement", nextPlacement);
    }
    if (nextPlacement !== currentPlacement && this.element.getAttribute("aria-hidden") !== "true") {
      this._startPointerAnimation(nextPlacement);
    }
  }

  syncVisibility(
    visible: boolean,
    position: DOMRect,
    step: TourElementStep,
    popoverPlacement?: ResolvedPlacement,
  ) {
    this.cancelAnimations();
    this.popoverPlacement = popoverPlacement;
    if (!visible) {
      this.element.style.setProperty("opacity", "0");
      this.element.setAttribute("aria-hidden", "true");
      this.element.removeAttribute("data-glow-tour-placement");
      return;
    }

    const styles = this._getNextStyles(position, step);
    for (const [property, value] of Object.entries(styles)) {
      if (value != null) this.element.style.setProperty(property, String(value));
    }
    this.element.style.setProperty("opacity", "1");
    this.element.removeAttribute("aria-hidden");
    const placement = this.element.getAttribute("data-glow-tour-placement") as TryOrderOptions;
    this._startPointerAnimation(placement);
  }

  override cancelAnimations() {
    super.cancelAnimations();
    this._stopAnimation();
  }

  private async _appear(position: DOMRect, step: TourElementStep) {
    const styles = this._getNextStyles(position, step);
    for (const [property, value] of Object.entries(styles)) {
      if (value != null) this.element.style.setProperty(property, String(value));
    }

    const animation = this._startAnimation(
      { opacity: 1 },
      {
        ...this._getAnimationOptions(),
        fill: "none",
      },
    );
    if (animation && !(await this._waitForAnimation(animation))) return;

    this.element.style.setProperty("opacity", "1");
    this.element.removeAttribute("aria-hidden");
    const placement = this.element.getAttribute("data-glow-tour-placement") as TryOrderOptions;
    this._startPointerAnimation(placement);
  }

  protected async _disappear() {
    this._stopAnimation();
    const animation = this._startAnimation(
      { opacity: 0 },
      {
        ...this._getAnimationOptions(),
        fill: "none",
      },
    );
    if (animation && !(await this._waitForAnimation(animation))) return;

    this.element.style.setProperty("opacity", "0");
    this.element.setAttribute("aria-hidden", "true");
    this.element.removeAttribute("data-glow-tour-placement");
  }

  private _resolvePosition(targetPosition: DOMRect, step: TourElementStep): PointerPosition {
    const pointerPosition = this.element.getBoundingClientRect();
    const excludedPlacement =
      this.popoverPlacement === "center" ? undefined : this.popoverPlacement;
    const configuredOrder = step.indicator?.placementTryOrder ?? [];
    const tryOrder = [...new Set([...configuredOrder, ...DEFAULT_TRY_ORDER])].filter(
      (placement): placement is TryOrderOptions => placement !== excludedPlacement,
    );
    const gap = Math.max(0, step.indicator?.gap ?? DEFAULT_INDICATOR_GAP);
    const candidates = this._getCandidates(targetPosition, pointerPosition, gap);

    for (const placement of tryOrder) {
      const candidate = candidates[placement];
      if (
        isInViewport(
          {
            left: candidate.x,
            top: candidate.y,
            right: candidate.x + pointerPosition.width,
            bottom: candidate.y + pointerPosition.height,
          },
          this.element,
        )
      ) {
        return { ...candidate, placement };
      }
    }

    const placement = tryOrder[0] ?? DEFAULT_TRY_ORDER[0];
    const candidate = candidates[placement];
    const viewport = viewportDimensions(this.element);

    return {
      placement,
      x: Math.min(Math.max(candidate.x, 0), Math.max(viewport.width - pointerPosition.width, 0)),
      y: Math.min(Math.max(candidate.y, 0), Math.max(viewport.height - pointerPosition.height, 0)),
    };
  }

  private _getCandidates(targetPosition: DOMRect, pointerPosition: DOMRect, gap: number) {
    const centeredX = targetPosition.left + (targetPosition.width - pointerPosition.width) / 2;
    const centeredY = targetPosition.top + (targetPosition.height - pointerPosition.height) / 2;

    return {
      top: {
        x: centeredX,
        y: targetPosition.top - pointerPosition.height - gap,
      },
      bottom: {
        x: centeredX,
        y: targetPosition.bottom + gap,
      },
      left: {
        x: targetPosition.left - pointerPosition.width - gap,
        y: centeredY,
      },
      right: {
        x: targetPosition.right + gap,
        y: centeredY,
      },
    } satisfies Record<TryOrderOptions, { x: number; y: number }>;
  }

  private _startPointerAnimation(placement: TryOrderOptions) {
    this._stopAnimation();
    this.animation = this._startAnimation(
      [{ transform: "translate(0px, 0px)" }, { transform: this._getTargetTransform(placement) }],
      {
        direction: "alternate",
        duration: POINTER_ANIMATION_DURATION,
        easing: "ease-in-out",
        iterations: Number.POSITIVE_INFINITY,
      },
    );
  }

  private _stopAnimation() {
    this.animation?.cancel();
    this.animation = null;
    this.element.style.removeProperty("transform");
  }

  protected _release() {
    this._stopAnimation();
    this.element.style.setProperty("opacity", "0");
    this.element.setAttribute("aria-hidden", "true");
    this.element.removeAttribute("data-glow-tour-placement");
  }

  private _getTargetTransform(placement: TryOrderOptions) {
    switch (placement) {
      case "top":
        return `translate(0px, ${POINTER_ANIMATION_DISTANCE}px)`;
      case "bottom":
        return `translate(0px, -${POINTER_ANIMATION_DISTANCE}px)`;
      case "left":
        return `translate(${POINTER_ANIMATION_DISTANCE}px, 0px)`;
      case "right":
        return `translate(-${POINTER_ANIMATION_DISTANCE}px, 0px)`;
    }
  }
}
