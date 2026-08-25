import type { AnimationOptions, GlowTourElementName } from "../types";

const DEFAULT_OVERLAY_PADDING = 16;
const DEFAULT_OVERLAY_RADIUS = 12;
const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

export const POPOVER_INITIAL_STYLE = {
  position: "fixed",
  left: "0px",
  top: "0px",
  opacity: "0",
};

export const OVERLAY_INITIAL_STYLE = {
  position: "fixed",
  left: "0px",
  top: "0px",
  width: "100%",
  height: "100%",
  opacity: "0",
};

function getKeyframes(reversed?: boolean) {
  const keyFrames = [{ opacity: 0 }, { opacity: 1 }];

  if (reversed) {
    return keyFrames.reverse();
  }
  return keyFrames;
}

function roundedRectPath(
  rect: DOMRect,
  viewport: { width: number; height: number },
  options: { padding: number; radius: number },
) {
  const padding = options.padding;
  const radius = options.radius;
  const x = Math.round(rect.left - padding);
  const y = Math.round(rect.top - padding);
  const width = Math.round(rect.width + padding * 2);
  const height = Math.round(rect.height + padding * 2);
  const right = x + width;
  const bottom = y + height;
  const corner = Math.max(0, Math.min(radius, width / 2, height / 2));

  return [
    `M0,0 H${Math.round(viewport.width)} V${Math.round(viewport.height)} H0 Z`,
    `M${x},${y + corner}`,
    `Q${x},${y} ${x + corner},${y}`,
    `H${right - corner}`,
    `Q${right},${y} ${right},${y + corner}`,
    `V${bottom - corner}`,
    `Q${right},${bottom} ${right - corner},${bottom}`,
    `H${x + corner}`,
    `Q${x},${bottom} ${x},${bottom - corner}`,
    "Z",
  ].join(" ");
}

export const TourAnimations = {
  FRAME_RATE: 60,

  enter(elements: Map<GlowTourElementName, Element>, options?: AnimationOptions) {
    const { duration = DEFAULT_ANIMATION_DURATION, easing = DEFAULT_ANIMATION_EASING } =
      options || {};
    const overlay = elements.get("overlay");
    const popover = elements.get("popover");
    if (!overlay || !popover) {
      return;
    }
    const keyframes = getKeyframes();

    for (const element of [overlay, popover]) {
      element.animate(keyframes, {
        duration,
        easing,
        fill: "forwards",
      });
    }
  },
  exit(elements: Map<GlowTourElementName, Element>, options?: AnimationOptions) {
    const { duration = DEFAULT_ANIMATION_DURATION, easing = DEFAULT_ANIMATION_EASING } =
      options || {};
    const overlay = elements.get("overlay");
    const popover = elements.get("popover");
    if (!overlay || !popover) {
      return;
    }
    const keyframes = getKeyframes(true);
    const animations: Animation[] = [];
    for (const element of [overlay, popover]) {
      const animation = element.animate(keyframes, {
        duration,
        easing,
        fill: "forwards",
      });
      animations.push(animation);
    }

    return Promise.all(animations.map((animation) => animation.finished));
  },
  movePopover(
    elements: Map<GlowTourElementName, Element>,
    coord: { x: number; y: number },
    options?: AnimationOptions,
  ) {
    const { duration = DEFAULT_ANIMATION_DURATION, easing = DEFAULT_ANIMATION_EASING } =
      options || {};
    const popover = elements.get("popover");
    if (!popover) {
      return;
    }
    const nextTransform = `translate(${coord.x}px, ${coord.y}px)`;
    const currentTransform = (popover as HTMLElement).style.transform || "translate(0px, 0px)";

    popover.animate([{ transform: currentTransform }, { transform: nextTransform }], {
      duration,
      easing,
      fill: "forwards",
    });
  },
  moveOverlay(
    elements: Map<GlowTourElementName, Element>,
    viewport: { width: number; height: number },
    targetRect: DOMRect,
    options?: AnimationOptions & { padding?: number; radius?: number },
  ) {
    const { duration = DEFAULT_ANIMATION_DURATION, easing = DEFAULT_ANIMATION_EASING } =
      options || {};
    const overlay = elements.get("overlay");
    if (!overlay) {
      return;
    }
    const path = overlay.querySelector("path");
    if (!path) {
      return;
    }
    const overlayOptions = {
      padding: options?.padding ?? DEFAULT_OVERLAY_PADDING,
      radius: options?.radius ?? DEFAULT_OVERLAY_RADIUS,
    };
    path.animate(
      [{ d: path.getAttribute("d") }, { d: roundedRectPath(targetRect, viewport, overlayOptions) }],
      {
        duration,
        easing,
        fill: "forwards",
      },
    );
  },
};
