import type { IndicatorOptions, OverlayOptions, PopoverOptions } from "../types";

export interface TourElementStep {
  readonly indicator?: IndicatorOptions;
  readonly overlay?: OverlayOptions;
  readonly popover?: PopoverOptions;
}

const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

export default abstract class GlowTourElement<_T> {
  constructor(
    protected element: HTMLElement | SVGSVGElement,
    public options?: { duration?: number; easing?: string; disabled?: boolean },
  ) {}

  setAnimationOptions(options: { duration?: number; easing?: string; disabled?: boolean }) {
    this.options = options;
  }

  protected _getAnimationOptions(): KeyframeAnimationOptions {
    return {
      duration: this.options?.disabled ? 0 : (this.options?.duration ?? DEFAULT_ANIMATION_DURATION),
      easing: this.options?.easing ?? DEFAULT_ANIMATION_EASING,
      fill: "forwards",
    };
  }

  protected _isAnimated() {
    return this.options?.disabled !== true;
  }

  protected abstract _disappear(): Promise<void>;

  protected abstract _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe;

  abstract updatePosition(nextPosition: DOMRect, step: TourElementStep): void;

  abstract initializeProps(): void;

  getElement(): HTMLElement | SVGSVGElement | null {
    return this.element;
  }

  disappear() {
    return this._disappear();
  }
}
