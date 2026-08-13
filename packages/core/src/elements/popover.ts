import type { WorkflowStep } from "../engine/workflow-step";
import type { ResolvedPlacement, TryOrderOptions } from "../types";
import { roundByDPR, toggleElementAttribute, viewportDimensions } from "../utils/utils";
import GlowTourElement from "./base";

const DEFAULT_POPOVER_GAP = 14;
const ARROW_EDGE_INSET = 16;
const DEFAULT_TRY_ORDER = ["bottom", "top", "right", "left"] as const;
const REPLACEMENT_DIFF = 50; // pixels

export interface PopoverPosition {
  placement: ResolvedPlacement;
  x: number;
  y: number;
  arrowOffset: number | null;
}

export default class PopoverElement<T> extends GlowTourElement<T> {
  protected _getNextStyles(position: DOMRect, step: WorkflowStep<T>): Keyframe {
    const nextPosition = this.resolvePosition(position, step);
    this._applyPositionState(nextPosition);

    return {
      transform: `translate(${roundByDPR(nextPosition.x)}px, ${roundByDPR(nextPosition.y)}px)`,
    };
  }

  resolvePosition(targetPosition: DOMRect, step: WorkflowStep<T>): PopoverPosition {
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
    const arrowDisabled = step.popover?.disableArrow === true;

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
        (arrowOffset < ARROW_EDGE_INSET || arrowOffset > arrowAxisSize - ARROW_EDGE_INSET)
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
    this.element.setAttribute("data-glow-tour-placement", position.placement);
    toggleElementAttribute(
      this.element,
      "data-glow-tour-arrow-hidden",
      position.arrowOffset === null,
    );
    if (position.arrowOffset === null) {
      this.element.style.removeProperty("--glow-tour-arrow-offset");
    } else {
      this.element.style.setProperty(
        "--glow-tour-arrow-offset",
        `${roundByDPR(position.arrowOffset)}px`,
      );
    }
  }

  async moveToTarget(
    nextPosition: DOMRect,
    step: WorkflowStep<T>,
    appear: boolean,
    onChange?: () => void,
  ) {
    if (!appear) {
      await this._disappear();
    }

    onChange?.();

    await this._appear(nextPosition, step);
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      console.warn("No popover element found");
      return;
    }

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

  updatePosition(nextPosition: DOMRect, step: WorkflowStep<T>): void {
    const nextCoordinates = this.resolvePosition(nextPosition, step);
    const currentPlacement = this.element.getAttribute("data-glow-tour-placement");
    const currentTransform = this.element.style.transform;
    const currentCoordinatesStr = currentTransform.match(/translate\(([^)]+)\)/)?.[1];
    const currentCoordinatesList = currentCoordinatesStr
      ? currentCoordinatesStr.split(",").map((coord) => parseFloat(coord.trim()))
      : [0, 0];
    const currentCoordinates = { x: currentCoordinatesList[0], y: currentCoordinatesList[1] };
    const diffX = Math.abs(nextCoordinates.x - currentCoordinates.x);
    const diffY = Math.abs(nextCoordinates.y - currentCoordinates.y);
    this._applyPositionState(nextCoordinates);

    if (
      currentPlacement !== nextCoordinates.placement ||
      diffX > REPLACEMENT_DIFF ||
      diffY > REPLACEMENT_DIFF
    ) {
      void this.moveToTarget(nextPosition, step, false);
      return;
    }

  }

  async _appear(position: DOMRect, step: WorkflowStep<T>) {
    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      value != null && this.element.style.setProperty(key, String(value));
    }

    const animation = this.element.animate(
      [
        {
          opacity: 1,
        },
      ],
      this._getAnimationOptions(),
    );
    await animation.finished;

    this.element.style.setProperty("opacity", "1");
    this.element.removeAttribute("aria-hidden");
    this.element.removeAttribute("inert");
  }

  async _disappear() {
    const animation = this.element.animate(
      {
        opacity: 0,
      },
      this._getAnimationOptions(),
    );

    await animation.finished;

    animation.commitStyles();

    this.element.style.setProperty("opacity", "0");
    this.element.setAttribute("aria-hidden", "true");
    this.element.setAttribute("inert", "true");
    this.element.style.removeProperty("transform");
    this.element.style.setProperty("opacity", "0");
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
