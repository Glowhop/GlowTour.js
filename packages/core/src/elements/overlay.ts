import { roundedRectPath, viewportDimensions } from "../utils/utils";
import GlowTourElement, { type TourElementStep } from "./base";

const DEFAULT_OVERLAY_PADDING = 16;
const DEFAULT_OVERLAY_RADIUS = 12;

export default class OverlayElement<T> extends GlowTourElement<T> {
  private appliedColor: string | undefined;

  setInteractionAllowed(allowed: boolean) {
    this.element.style.setProperty("pointer-events", allowed ? "none" : "auto");
    this.element.setAttribute("data-glow-tour-allow-interaction", String(allowed));
  }

  async moveToTarget(nextPosition: DOMRect, step: TourElementStep) {
    const keyframe = this._getNextStyles(nextPosition, step);
    this.appliedColor = step.overlay?.color;

    const path = this._getPathElement();
    if (!path) {
      console.warn("No overlay path element found");
      return;
    }

    if (!path.style.getPropertyValue("d")) {
      for (const [property, value] of Object.entries(keyframe)) {
        if (property !== "opacity" && value != null) {
          path.style.setProperty(property, String(value));
        }
      }

      const opacity = keyframe.opacity == null ? "0.7" : String(keyframe.opacity);
      path.style.setProperty("opacity", "0");
      const animation = path.animate([{ opacity: "0" }, { opacity }], {
        ...this._getAnimationOptions(),
        fill: "none",
      });

      if (await this._waitForAnimation(animation)) {
        path.style.setProperty("opacity", opacity);
      }
      return;
    }

    const baseStyle = {
      d: path.style.getPropertyValue("d") ?? "",
      fill: path.style.getPropertyValue("fill") ?? "",
      opacity: path.style.getPropertyValue("opacity") ?? "0",
    };

    const animation = path.animate([baseStyle, keyframe], {
      ...this._getAnimationOptions(),
      fill: "none",
    });

    if (await this._waitForAnimation(animation)) animation.commitStyles();
  }

  _getNextStyles(position: DOMRect, step: TourElementStep): Keyframe {
    const { padding, radius, color, opacity } = step.overlay || {};

    const path = roundedRectPath(position, viewportDimensions(), {
      padding: padding ?? DEFAULT_OVERLAY_PADDING,
      radius: radius ?? DEFAULT_OVERLAY_RADIUS,
    });

    return {
      d: `path("${path}")`,
      fill: color,
      opacity: opacity != null ? String(opacity) : 0.7,
    };
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      console.warn("No overlay element found");
      return;
    }
    const viewport = viewportDimensions();

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
      console.warn("No overlay path element found");
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
    this.appliedColor = undefined;
    const path = this._getPathElement();
    path?.style.removeProperty("d");
    path?.style.removeProperty("fill");
    path?.style.setProperty("opacity", "0");
    this.element.style.setProperty("pointer-events", "none");
  }

  updatePosition(nextPosition: DOMRect, step: TourElementStep) {
    const { padding, radius, color, opacity } = step.overlay || {};
    const pathValue = roundedRectPath(nextPosition, viewportDimensions(), {
      padding: padding ?? DEFAULT_OVERLAY_PADDING,
      radius: radius ?? DEFAULT_OVERLAY_RADIUS,
    });
    const path = this._getPathElement();
    if (!path) {
      console.warn("No overlay path element found");
      return;
    }
    const pathStyle = `path("${pathValue}")`;
    if (path.style.getPropertyValue("d") !== pathStyle) {
      path.style.setProperty("d", pathStyle);
    }
    if (color === undefined && this.appliedColor !== undefined) {
      path.style.removeProperty("fill");
    } else if (color !== undefined && path.style.getPropertyValue("fill") !== color) {
      path.style.setProperty("fill", color);
    }
    this.appliedColor = color;
    const nextOpacity = String(opacity ?? 0.7);
    if (path.style.getPropertyValue("opacity") !== nextOpacity) {
      path.style.setProperty("opacity", nextOpacity);
    }
    const viewport = viewportDimensions();
    const viewBox = `0 0 ${viewport.width} ${viewport.height}`;
    if (this.element.getAttribute("viewBox") !== viewBox) {
      this.element.setAttribute("viewBox", viewBox);
    }
  }

  async _appear(position: DOMRect, step: TourElementStep) {
    const path = this._getPathElement();
    if (!path) {
      console.warn("No overlay path element found");
      return Promise.resolve();
    }

    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      value != null && path.style.setProperty(key, String(value));
    }

    const keyframe = {
      opacity: String(defaultStyles.opacity) ?? "0.7",
    };

    const animation = path.animate([keyframe], this._getAnimationOptions());

    await this._waitForAnimation(animation);
  }

  async _disappear() {
    const path = this._getPathElement();
    if (!path) {
      console.warn("No overlay path element found");
      return Promise.resolve();
    }

    const animation = path.animate(
      {
        opacity: "0",
      },
      { ...this._getAnimationOptions(), fill: "none" },
    );

    if (!(await this._waitForAnimation(animation))) return;

    animation.commitStyles();

    path.style.removeProperty("d");
    path.style.removeProperty("fill");
    this.element.style.setProperty("pointer-events", "none");
  }
}
