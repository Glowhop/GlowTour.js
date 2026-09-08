import { cssEasing } from "../utils/easing";
import {
  canInterpolatePathData,
  interpolatePathData,
  ownerWindow,
  paintedBoxDimensions,
  roundedRectPath,
} from "../utils/utils";
import GlowTourElement, { type TourElementStep } from "./base";
import { OVERLAY_IDLE_ATTRIBUTES, OVERLAY_IDLE_STYLE } from "./idle-presentation";

const DEFAULT_OVERLAY_PADDING = 8;
const DEFAULT_OVERLAY_RADIUS = 8;

interface OverlayVisualState {
  color: string | undefined;
  opacity: number | undefined;
  padding: number | undefined;
  radius: number | undefined;
}

/** A cutout tween driven by `requestAnimationFrame`. */
interface GeometryTween {
  cancel(): void;
}

export default class OverlayElement extends GlowTourElement {
  private currentTransition: Animation | null = null;
  private geometryTween: GeometryTween | null = null;
  private visualState: OverlayVisualState | null = null;
  private cssPathDSupported: boolean | null = null;

  setInteractionAllowed(allowed: boolean) {
    this.element.style.setProperty("pointer-events", allowed ? "none" : "auto");
    this.element.setAttribute("data-glow-tour-allow-interaction", String(allowed));
  }

  async moveToTarget(nextPosition: DOMRect, step: TourElementStep) {
    const nextVisualState = this._getVisualState(step);

    const path = this._getPathElement();
    if (!path) {
      this.visualState = nextVisualState;
      return;
    }
    const keyframe = this.getRenderedTargetStyles(path, this._getNextStyles(nextPosition, step));
    this.visualState = nextVisualState;

    if (!this.readPathD(path)) {
      const { opacity: _initialOpacity, ...geometry } = keyframe;
      this.applyStyles(path, geometry);

      const opacity = keyframe.opacity == null ? "0.7" : String(keyframe.opacity);
      path.style.setProperty("opacity", "0");
      const animation = this._startAnimation(
        [{ opacity: "0" }, { opacity }],
        {
          ...this._getAnimationOptions(),
          fill: "none",
        },
        path,
      );

      if (!animation || (await this._waitForAnimation(animation))) this.applyStyles(path, keyframe);
      return;
    }

    const baseStyle = {
      d: this.readPathD(path),
      fill: path.style.getPropertyValue("fill") ?? "",
      opacity: path.style.getPropertyValue("opacity") ?? "0",
    };

    const animation = this._startPathAnimation(
      [baseStyle, keyframe],
      {
        ...this._getAnimationOptions(),
        fill: "none",
      },
      path,
    );

    if (!animation || (await this._waitForAnimation(animation))) this.applyStyles(path, keyframe);
  }

  async animateTo(position: DOMRect, step: TourElementStep) {
    const path = this._getPathElement();
    if (!path) return;

    this.commitAndCancelCurrentTransition(path);

    const from = this.getCurrentRenderedStyles(path);
    const finalStyles = this.getRenderedTargetStyles(path, this._getNextStyles(position, step));
    const animation = this._startPathAnimation(
      [from, finalStyles],
      {
        ...this._getAnimationOptions(),
        fill: "none",
      },
      path,
    );
    if (!animation) {
      this.applyStyles(path, finalStyles);
      return;
    }
    this.currentTransition = animation;

    try {
      const completed = await this._waitForAnimation(animation);
      if (completed && this.currentTransition === animation) {
        this.applyStyles(path, finalStyles);
      }
    } finally {
      if (this.currentTransition === animation) this.currentTransition = null;
    }
  }

  _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe {
    const { padding, radius, color, opacity } = step.overlay || {};

    const path = roundedRectPath(
      position,
      paintedBoxDimensions(this.element),
      {
        padding: padding ?? DEFAULT_OVERLAY_PADDING,
        radius: radius ?? DEFAULT_OVERLAY_RADIUS,
      },
      this.element,
    );

    return {
      d: `path("${path}")`,
      fill: color,
      opacity: opacity != null ? String(opacity) : 0.7,
    };
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      return;
    }
    for (const [property, value] of Object.entries(OVERLAY_IDLE_STYLE)) {
      el.style.setProperty(property, value);
    }
    for (const [name, value] of Object.entries(OVERLAY_IDLE_ATTRIBUTES)) {
      el.setAttribute(name, value);
    }
    // `100%` resolves against the initial containing block, which mobile
    // engines keep at whatever the viewport measures with the URL bar in its
    // current state — so the backdrop stops short of the bottom of the screen
    // as soon as that bar retracts. `100lvh` is the *largest* viewport by
    // definition and therefore always spans the visible area; where it is not
    // understood the declaration is dropped and the `100%` above still stands.
    el.style.setProperty("height", "100lvh");
    this.syncViewBox();
  }

  private _getPathElement(): SVGPathElement | null {
    return this.element.querySelector("path");
  }

  protected _release() {
    this.currentTransition = null;
    this._stopGeometryTween();
    this.visualState = null;
    const path = this._getPathElement();
    if (path) this.writePathD(path, null);
    path?.style.removeProperty("fill");
    path?.style.setProperty("opacity", "0");
    this.element.style.setProperty("pointer-events", "none");
  }

  updatePosition(
    nextPosition: DOMRect,
    step: TourElementStep,
    animateChanges = false,
    onTransition?: (transition: Promise<void>) => void,
  ) {
    const path = this._getPathElement();
    if (!path) {
      return;
    }

    const nextVisualState = this._getVisualState(step);
    const shouldAnimate =
      animateChanges &&
      this.visualState !== null &&
      !this._isSameVisualState(this.visualState, nextVisualState);

    if (shouldAnimate) {
      const transition = this.animateTo(nextPosition, step);
      if (onTransition) onTransition(transition);
      else void transition.catch(() => {});
    } else
      this.applyStyles(
        path,
        this.getRenderedTargetStyles(path, this._getNextStyles(nextPosition, step)),
      );
    this.visualState = nextVisualState;

    this.syncViewBox();
  }

  /**
   * Pins the `viewBox` to the element's own box, so one SVG unit is one CSS
   * pixel and the cutout lands where `getBoundingClientRect()` said it should.
   */
  private syncViewBox() {
    const viewport = paintedBoxDimensions(this.element);
    const viewBox = `0 0 ${viewport.width} ${viewport.height}`;
    if (this.element.getAttribute("viewBox") !== viewBox) {
      this.element.setAttribute("viewBox", viewBox);
    }
  }

  override cancelAnimations() {
    this.currentTransition = null;
    this._stopGeometryTween();
    super.cancelAnimations();
  }

  /**
   * Starts an animation whose keyframes carry the cutout geometry.
   *
   * WebKit ignores `d` both as a CSS property and as an animatable value, so
   * there the geometry is stripped from the keyframes — WAAPI only animates
   * fill and opacity — and the shape is moved by {@link _startGeometryTween}
   * instead, which writes interpolated path data to the `d` attribute frame by
   * frame. That is the same technique driver.js uses, and it is what keeps the
   * cutout gliding on iOS rather than snapping to each target. If the tween
   * cannot run (animations disabled, no frame scheduler, geometry that is not
   * structurally comparable) the final shape is committed up front, which is
   * the old snap-and-be-correct behaviour.
   */
  private _startPathAnimation(
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    path: SVGPathElement,
  ): Animation | null {
    this._stopGeometryTween();
    if (this.supportsCssPathD()) return this._startAnimation(keyframes, options, path);

    const finalGeometry = keyframes[keyframes.length - 1]?.d;
    const initialGeometry = keyframes[0]?.d;
    const animation = this._startAnimation(
      keyframes.map(({ d: _geometry, ...rest }) => rest),
      options,
      path,
    );

    if (finalGeometry != null) {
      const to = String(finalGeometry);
      const from = initialGeometry == null ? "" : String(initialGeometry);
      if (!animation || !this._startGeometryTween(path, from, to, options)) {
        this.writePathD(path, to);
      }
    }

    return animation;
  }

  /**
   * Morphs the cutout by hand, one frame at a time.
   *
   * The two paths always come out of {@link roundedRectPath}, so they carry the
   * same commands in the same order and can be interpolated operand by operand.
   * Progress is put through the same easing as the sibling WAAPI animation so
   * the shape, the backdrop and the popover stay in step.
   *
   * @returns Whether the tween took ownership of the geometry. `false` leaves
   *   the caller responsible for committing the final shape.
   */
  private _startGeometryTween(
    path: SVGPathElement,
    from: string,
    to: string,
    options: KeyframeAnimationOptions,
  ): boolean {
    const currentWindow = ownerWindow(this.element);
    const request = currentWindow?.requestAnimationFrame;
    const cancel = currentWindow?.cancelAnimationFrame;
    const duration = typeof options.duration === "number" ? options.duration : 0;
    const fromData = pathDataFromCssValue(from);
    const toData = pathDataFromCssValue(to);
    if (
      !this._isAnimated() ||
      !(duration > 0) ||
      typeof request !== "function" ||
      typeof cancel !== "function" ||
      !canInterpolatePathData(fromData, toData)
    )
      return false;

    const ease = cssEasing(typeof options.easing === "string" ? options.easing : undefined);
    let frame = 0;
    let start: number | null = null;
    const tween: GeometryTween = { cancel: () => cancel.call(currentWindow, frame) };

    const drawFrame = (timestamp: number) => {
      if (this.geometryTween !== tween) return;
      if (start === null) start = timestamp;
      const elapsed = Math.max(0, timestamp - start);
      const progress = Math.min(1, elapsed / duration);
      this.writePathD(path, `path("${interpolatePathData(fromData, toData, ease(progress))}")`);
      if (progress >= 1) {
        this.geometryTween = null;
        return;
      }
      frame = request.call(currentWindow, drawFrame);
    };

    // Published before the first frame is asked for: `drawFrame` bails on any
    // tween that is no longer the current one, and would bail on this one.
    this.geometryTween = tween;
    frame = request.call(currentWindow, drawFrame);
    return true;
  }

  /** Drops the running cutout tween, leaving the shape wherever it got to. */
  private _stopGeometryTween() {
    const tween = this.geometryTween;
    this.geometryTween = null;
    tween?.cancel();
  }

  /**
   * Whether this document implements the CSS `d` property. Safari/WebKit — and
   * therefore every browser on iOS, Chrome included — does not: an inline
   * `d: path(...)` is dropped on the floor and the backdrop never draws.
   */
  private supportsCssPathD(): boolean {
    if (this.cssPathDSupported === null) {
      const currentWindow = ownerWindow(this.element);
      try {
        this.cssPathDSupported = currentWindow?.CSS?.supports?.("d", 'path("M0 0")') === true;
      } catch {
        this.cssPathDSupported = false;
      }
    }
    return this.cssPathDSupported;
  }

  /**
   * Writes the cutout geometry. The `d` attribute is the source of truth since
   * every engine honours it; the CSS property is mirrored where it exists,
   * because that is what makes the shape animatable and what wins the cascade.
   */
  private writePathD(path: SVGPathElement, value: string | null) {
    if (value == null || value === "") {
      path.style.removeProperty("d");
      path.removeAttribute("d");
      return;
    }
    path.style.setProperty("d", value);
    path.setAttribute("d", pathDataFromCssValue(value));
  }

  /** The current geometry, as the `path("...")` CSS value the keyframes use. */
  private readPathD(path: SVGPathElement): string {
    const inline = path.style.getPropertyValue("d");
    if (inline) return inline;
    const attribute = path.getAttribute("d");
    return attribute ? `path("${attribute}")` : "";
  }

  private applyStyles(path: SVGPathElement, styles: Keyframe) {
    for (const [property, value] of Object.entries(styles)) {
      if (property === "d") {
        const next = value == null ? null : String(value);
        // Geometry set outright supersedes a tween still walking towards it;
        // otherwise the next frame would drag the cutout back.
        if (this.readPathD(path) !== (next ?? "")) {
          this._stopGeometryTween();
          this.writePathD(path, next);
        }
      } else if (value == null) {
        if (path.style.getPropertyValue(property)) path.style.removeProperty(property);
      } else if (path.style.getPropertyValue(property) !== String(value)) {
        path.style.setProperty(property, String(value));
      }
    }
  }

  private commitAndCancelCurrentTransition(path: SVGPathElement) {
    const animation = this.currentTransition;
    if (!animation) return;

    this._stopGeometryTween();
    this.applyStyles(path, this.getCurrentRenderedStyles(path));
    this.currentTransition = null;
    this._cancelAnimation(animation);
  }

  private getCurrentRenderedStyles(path: SVGPathElement): Keyframe {
    const computed = computedStyle(path);
    return {
      d: computed?.getPropertyValue("d") || this.readPathD(path),
      fill: computed?.getPropertyValue("fill") || path.style.getPropertyValue("fill"),
      opacity: computed?.getPropertyValue("opacity") || path.style.getPropertyValue("opacity"),
    };
  }

  private getRenderedTargetStyles(path: SVGPathElement, styles: Keyframe): Keyframe {
    if (styles.fill != null) return styles;

    const inlineFill = path.style.getPropertyValue("fill");
    if (inlineFill && this.visualState?.color === undefined) {
      return { ...styles, fill: inlineFill };
    }
    path.style.removeProperty("fill");
    const renderedFill = computedStyle(path)?.getPropertyValue("fill");
    if (inlineFill) path.style.setProperty("fill", inlineFill);

    return { ...styles, fill: renderedFill ?? "" };
  }

  private _getVisualState(step: TourElementStep): OverlayVisualState {
    return {
      color: step.overlay?.color,
      opacity: step.overlay?.opacity,
      padding: step.overlay?.padding,
      radius: step.overlay?.radius,
    };
  }

  private _isSameVisualState(current: OverlayVisualState, next: OverlayVisualState) {
    return (
      current.color === next.color &&
      current.opacity === next.opacity &&
      current.padding === next.padding &&
      current.radius === next.radius
    );
  }

  async _appear(position: DOMRect, step: TourElementStep) {
    const path = this._getPathElement();
    if (!path) {
      return Promise.resolve();
    }

    const finalStyles = this.getRenderedTargetStyles(path, this._getNextStyles(position, step));
    const opacity = String(finalStyles.opacity ?? "0.7");
    this.applyStyles(path, { ...finalStyles, opacity: "0" });
    const animation = this._startAnimation(
      [{ opacity: "0" }, { opacity }],
      {
        ...this._getAnimationOptions(),
        fill: "none",
      },
      path,
    );

    if (!animation || (await this._waitForAnimation(animation)))
      this.applyStyles(path, finalStyles);
  }

  async _disappear() {
    const path = this._getPathElement();
    if (!path) {
      return Promise.resolve();
    }

    this._stopGeometryTween();
    const animation = this._startAnimation(
      {
        opacity: "0",
      },
      { ...this._getAnimationOptions(), fill: "none" },
      path,
    );

    if (animation && !(await this._waitForAnimation(animation))) return;

    this.writePathD(path, null);
    path.style.removeProperty("fill");
    path.style.setProperty("opacity", "0");
    this.element.style.setProperty("pointer-events", "none");
  }
}

/** Unwraps `path("M0 0 ...")` into the raw path data the `d` attribute takes. */
function pathDataFromCssValue(value: string): string {
  return value.replace(/^path\(\s*(["'])([\s\S]*)\1\s*\)$/, "$2");
}

function computedStyle(element: Element): CSSStyleDeclaration | null {
  const document = element.ownerDocument;
  const currentWindow =
    document && "defaultView" in document ? document.defaultView : ownerWindow(element);
  return typeof currentWindow?.getComputedStyle === "function"
    ? currentWindow.getComputedStyle(element)
    : null;
}
