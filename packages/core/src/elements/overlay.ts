import { ownerWindow, roundedRectPath, viewportDimensions } from "../utils/utils";
import GlowTourElement, { type TourElementStep } from "./base";

const DEFAULT_OVERLAY_PADDING = 16;
const DEFAULT_OVERLAY_RADIUS = 12;

interface OverlayVisualState {
  color: string | undefined;
  opacity: number | undefined;
  padding: number | undefined;
  radius: number | undefined;
}

export default class OverlayElement extends GlowTourElement {
  private currentTransition: Animation | null = null;
  private visualState: OverlayVisualState | null = null;

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

    if (!path.style.getPropertyValue("d")) {
      for (const [property, value] of Object.entries(keyframe)) {
        if (property !== "opacity" && value != null) {
          path.style.setProperty(property, String(value));
        }
      }

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
      d: path.style.getPropertyValue("d") ?? "",
      fill: path.style.getPropertyValue("fill") ?? "",
      opacity: path.style.getPropertyValue("opacity") ?? "0",
    };

    const animation = this._startAnimation(
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
    const animation = this._startAnimation(
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
      viewportDimensions(this.element),
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
    const viewport = viewportDimensions(el);

    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "10000");
    el.style.setProperty("top", "0px");
    el.style.setProperty("left", "0px");
    el.style.setProperty("width", "100%");
    el.style.setProperty("height", "100%");
    el.style.setProperty("fill-rule", "evenodd");
    el.style.setProperty("clip-rule", "evenodd");
    el.style.setProperty("stroke-linejoin", "round");
    el.style.setProperty("stroke-miterlimit", "2");
    el.style.setProperty("pointer-events", "none");

    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-glow-tour-allow-interaction", "false");
    el.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    el.setAttribute("inert", "true");

    const path = el.querySelector("path");
    if (!path) {
      return;
    }

    path.setAttribute("opacity", "0");
    path.setAttribute("pointer-events", "auto");
    path.setAttribute("cursor", "auto");
  }

  private _getPathElement(): SVGPathElement | null {
    return this.element.querySelector("path");
  }

  protected _release() {
    this.currentTransition = null;
    this.visualState = null;
    const path = this._getPathElement();
    path?.style.removeProperty("d");
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

    const viewport = viewportDimensions(this.element);
    const viewBox = `0 0 ${viewport.width} ${viewport.height}`;
    if (this.element.getAttribute("viewBox") !== viewBox) {
      this.element.setAttribute("viewBox", viewBox);
    }
  }

  override cancelAnimations() {
    this.currentTransition = null;
    super.cancelAnimations();
  }

  private applyStyles(path: SVGPathElement, styles: Keyframe) {
    for (const [property, value] of Object.entries(styles)) {
      if (value == null) {
        if (path.style.getPropertyValue(property)) path.style.removeProperty(property);
      } else if (path.style.getPropertyValue(property) !== String(value)) {
        path.style.setProperty(property, String(value));
      }
    }
  }

  private commitAndCancelCurrentTransition(path: SVGPathElement) {
    const animation = this.currentTransition;
    if (!animation) return;

    this.applyStyles(path, this.getCurrentRenderedStyles(path));
    this.currentTransition = null;
    this._cancelAnimation(animation);
  }

  private getCurrentRenderedStyles(path: SVGPathElement): Keyframe {
    const computed = computedStyle(path);
    return {
      d: computed?.getPropertyValue("d") || path.style.getPropertyValue("d"),
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

    const animation = this._startAnimation(
      {
        opacity: "0",
      },
      { ...this._getAnimationOptions(), fill: "none" },
      path,
    );

    if (animation && !(await this._waitForAnimation(animation))) return;

    path.style.removeProperty("d");
    path.style.removeProperty("fill");
    path.style.setProperty("opacity", "0");
    this.element.style.setProperty("pointer-events", "none");
  }
}

function computedStyle(element: Element): CSSStyleDeclaration | null {
  const document = element.ownerDocument;
  const currentWindow =
    document && "defaultView" in document ? document.defaultView : ownerWindow(element);
  return typeof currentWindow?.getComputedStyle === "function"
    ? currentWindow.getComputedStyle(element)
    : null;
}
