import type { TargetResolver } from "../types";

export function ownerWindow(element?: Node | null): (Window & typeof globalThis) | null {
  return element?.ownerDocument?.defaultView ?? (typeof window === "undefined" ? null : window);
}

export function ownerDocument(element?: Node | null): Document | null {
  return element?.ownerDocument ?? (typeof document === "undefined" ? null : document);
}

export function isHTMLElement(value: unknown, context?: Node | null): value is HTMLElement {
  const HTMLElement = ownerWindow(context)?.HTMLElement ?? globalThis.HTMLElement;
  return typeof HTMLElement === "function" && value instanceof HTMLElement;
}

export function isElement(value: unknown, context?: Node | null): value is Element {
  const Element = ownerWindow(context)?.Element ?? globalThis.Element;
  return typeof Element === "function" && value instanceof Element;
}

export function isNode(value: unknown, context?: Node | null): value is Node {
  const Node = ownerWindow(context)?.Node ?? globalThis.Node;
  return typeof Node === "function" && value instanceof Node;
}

export function viewportDimensions(context?: Node | null) {
  const currentWindow = ownerWindow(context);
  return {
    width: currentWindow?.innerWidth ?? 1024,
    height: currentWindow?.innerHeight ?? 768,
  };
}

export function isInViewport(
  rect: { left: number; top: number; right: number; bottom: number },
  context?: Node | null,
) {
  const viewport = viewportDimensions(context);

  return (
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= viewport.width &&
    rect.bottom <= viewport.height
  );
}

export function roundByDPR(value: number, context?: Node | null) {
  const dpr = ownerWindow(context)?.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
}

export function roundedRectPath(
  rect: DOMRect,
  viewport: { width: number; height: number },
  options: { padding: number; radius: number },
  context?: Node | null,
) {
  const padding = options.padding;
  const radius = options.radius;
  const x = roundByDPR(rect.left - padding, context);
  const y = roundByDPR(rect.top - padding, context);
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const right = roundByDPR(rect.left + rect.width + padding, context);
  const bottom = roundByDPR(rect.top + rect.height + padding, context);
  const corner = roundByDPR(Math.max(0, Math.min(radius, width / 2, height / 2)), context);

  return [
    `M0,0 H${roundByDPR(viewport.width, context)} V${roundByDPR(viewport.height, context)} H0 Z`,
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
  options: { readonly document?: Document; readonly signal: AbortSignal },
  path = "target",
): Promise<HTMLElement | null> {
  const rootDocument = options.document;
  if (typeof target === "string") {
    const element = rootDocument
      ? rootDocument.querySelector<HTMLElement>(target)
      : typeof document === "undefined"
        ? null
        : document.querySelector<HTMLElement>(target);
    return rootDocument ? validateTargetElement(element, rootDocument, path) : element;
  } else if (typeof target === "function") {
    const element = await target({ signal: options.signal });
    return rootDocument ? validateTargetElement(element, rootDocument, path) : element;
  }
  if (rootDocument) return validateTargetElement(target, rootDocument, path);
  return typeof HTMLElement !== "undefined" && target instanceof HTMLElement ? target : null;
}

function validateTargetElement(
  candidate: HTMLElement | null,
  rootDocument: Document,
  path: string,
): HTMLElement | null {
  if (candidate === null) return null;
  const HTMLElement = rootDocument.defaultView?.HTMLElement;
  if (
    typeof HTMLElement !== "function" ||
    !(candidate instanceof HTMLElement) ||
    candidate.ownerDocument !== rootDocument
  ) {
    throw new TypeError(
      `Invalid target: ${path} must resolve to an HTMLElement in the root document`,
    );
  }
  return candidate.isConnected ? candidate : null;
}
