import type { IndicatorOptions, OverlayOptions, PopoverOptions } from "../types";

export interface TourElementStep {
  readonly indicator?: IndicatorOptions;
  readonly overlay?: OverlayOptions;
  readonly popover?: PopoverOptions;
}

const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

export default abstract class GlowTourElement {
  private readonly animations = new Set<Animation>();
  private readonly cancelledAnimations = new WeakSet<Animation>();
  private released = false;
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
    return this.options?.disabled !== true && this.options?.duration !== 0;
  }

  protected _startAnimation(
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: KeyframeAnimationOptions,
    target: Element = this.element,
  ): Animation | null {
    if (!this._isAnimated() || typeof target.animate !== "function") return null;

    try {
      return target.animate(keyframes, options ?? this._getAnimationOptions());
    } catch {
      return null;
    }
  }

  /**
   * The document driving `animation.finished`, when there is one.
   *
   * `Animation.timeline` is the document timeline, and a hidden document
   * freezes it — see {@link _finishWhileDocumentHidden}.
   */
  private _getDocument(): Document | null {
    const owner = this.element.ownerDocument;
    return owner && typeof owner.addEventListener === "function" ? owner : null;
  }

  /**
   * Ends an animation that cannot progress, and keeps ending it for as long as
   * the document stays hidden.
   *
   * A hidden document freezes its timeline: `currentTime` stops advancing, the
   * animation stays `running` forever, and `animation.finished` never settles.
   * Awaiting it would strand the caller — a tour transition would never
   * complete, leaving the controller stuck in `transitioning`. Finishing the
   * animation resolves `finished` even on a frozen timeline, so the transition
   * lands on its final state immediately instead of hanging.
   *
   * @returns A cleanup function removing the visibility listener.
   */
  private _finishWhileDocumentHidden(animation: Animation): () => void {
    const owner = this._getDocument();
    if (!owner) return () => {};

    const finishIfHidden = () => {
      if (owner.visibilityState !== "hidden") return;
      try {
        animation.finish();
      } catch {
        // A cancelled or already-finished animation has nothing left to end.
      }
    };
    finishIfHidden();
    owner.addEventListener("visibilitychange", finishIfHidden);
    return () => owner.removeEventListener("visibilitychange", finishIfHidden);
  }

  protected async _waitForAnimation(animation: Animation) {
    if (this.released) {
      animation.cancel();
      return false;
    }
    this.animations.add(animation);
    const stopWatchingVisibility = this._finishWhileDocumentHidden(animation);
    try {
      await animation.finished;
      return !this.released && !this.cancelledAnimations.has(animation);
    } catch (error) {
      if (this.released || this.cancelledAnimations.has(animation)) return false;
      throw error;
    } finally {
      stopWatchingVisibility();
      this.animations.delete(animation);
    }
  }

  protected abstract _disappear(): Promise<void>;

  protected abstract _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe;

  abstract updatePosition(nextPosition: DOMRect, step: TourElementStep): void;

  abstract initializeProps(): void;

  getElement(): HTMLElement | SVGSVGElement | null {
    return this.released ? null : this.element;
  }

  disappear() {
    return this._disappear();
  }

  release() {
    if (this.released) return;
    this.released = true;
    this.cancelAnimations();
    this._release();
  }

  cancelAnimations() {
    for (const animation of this.animations) {
      this._cancelAnimation(animation);
    }
    this.animations.clear();
  }

  protected _cancelAnimation(animation: Animation) {
    this.cancelledAnimations.add(animation);
    animation.cancel();
  }

  protected abstract _release(): void;
}
