import type { TargetResolver } from "../types";

export function viewportDimensions() {
  return {
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  };
}

export function isInViewport(rect: { left: number; top: number; right: number; bottom: number }) {
  const viewport = viewportDimensions();

  return (
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= viewport.width &&
    rect.bottom <= viewport.height
  );
}

export function roundByDPR(value: number) {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
}

export function roundedRectPath(
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

export function toggleElementAttribute(element: Element, name: string, enabled: boolean) {
  if (typeof element.toggleAttribute === "function") {
    element.toggleAttribute(name, enabled);
    return;
  }

  if (enabled) {
    element.setAttribute(name, "");
    return;
  }

  if (typeof element.removeAttribute === "function") {
    element.removeAttribute(name);
  }
}

export async function resolveTargetElement(
  target: TargetResolver,
  signal = new AbortController().signal,
): Promise<HTMLElement | null> {
  if (typeof target === "string") {
    return typeof document === "undefined" ? null : document.querySelector<HTMLElement>(target);
  } else if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    return target;
  } else if (typeof target === "function") {
    return await target({ signal });
  }
  return null;
}
