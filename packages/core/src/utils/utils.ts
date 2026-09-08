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

/**
 * The layout viewport, in CSS pixels — the box every `position: fixed` tour
 * element is sized and positioned against, and the frame that
 * `getBoundingClientRect()` reports coordinates in.
 *
 * Deliberately not `innerWidth`/`innerHeight`: those measure the *visual*
 * viewport, which on mobile shrinks and grows with the browser's URL bar and on
 * desktop includes the classic scrollbar. Either gap skews the overlay's
 * `viewBox` against its own `100%`-sized box, and the default
 * `preserveAspectRatio` then scales and centres the backdrop — leaving undimmed
 * bands and a cutout that no longer lines up with its target.
 */
export function viewportDimensions(context?: Node | null) {
  const root = ownerDocument(context)?.documentElement;
  const width = root?.clientWidth;
  const height = root?.clientHeight;
  if (typeof width === "number" && width > 0 && typeof height === "number" && height > 0) {
    return { width, height };
  }

  const currentWindow = ownerWindow(context);
  return {
    width: currentWindow?.innerWidth ?? 1024,
    height: currentWindow?.innerHeight ?? 768,
  };
}

/**
 * The box the overlay `<svg>` is actually painted into, in CSS pixels.
 *
 * The overlay is `position: fixed` and sized to `100%`, and its `viewBox` has
 * to match that box exactly. Any mismatch makes the SVG scale its contents, and
 * `preserveAspectRatio` then either letterboxes the backdrop — the undimmed
 * bands mobile browsers show once a retracting URL bar moves the layout
 * viewport out of step with the initial containing block, which is what sizes
 * the element — or slices the cutout away from its target.
 *
 * Measuring the element sidesteps the question of which of the two each engine
 * resizes: whatever box it gave the overlay is the box the overlay draws in.
 * {@link viewportDimensions} stays the fallback for an element that has no box
 * yet — detached nodes, server-rendered markup, test doubles.
 */
export function paintedBoxDimensions(element?: Element | null) {
  const measure = element?.getBoundingClientRect;
  if (typeof measure === "function") {
    const rect = measure.call(element);
    if (rect.width > 0 && rect.height > 0) return { height: rect.height, width: rect.width };
  }
  return viewportDimensions(element);
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

/**
 * Every number in a path, with the sign that belongs to it. Path data packs
 * commands tightly (`h-120a5,5`), so the sign has to be read as part of the
 * number rather than as a separator.
 */
const PATH_NUMBER = /-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?/g;

/**
 * A path reduced to its command structure, with every number blanked out and
 * every separator dropped. Path data lets commas and whitespace stand in for
 * one another, and the two sides of a tween rarely agree: one is serialized by
 * {@link roundedRectPath}, the other often comes back from `getComputedStyle`
 * in whatever shape the engine prefers.
 */
function pathShape(data: string) {
  return data.replace(PATH_NUMBER, "#").replace(/[\s,]+/g, "");
}

/**
 * Whether two paths can be tweened number by number: same commands, in the
 * same order, taking the same operands. Everything {@link roundedRectPath}
 * emits satisfies this, so a mismatch means the geometry came from somewhere
 * else and should be committed rather than interpolated.
 */
export function canInterpolatePathData(from: string, to: string) {
  return from !== "" && to !== "" && pathShape(from) === pathShape(to);
}

/**
 * Linearly interpolates the operands of two structurally identical paths.
 *
 * Callers pass already-eased progress; this is the geometry half of a tween,
 * not its timing.
 */
export function interpolatePathData(from: string, to: string, progress: number) {
  const fromNumbers = from.match(PATH_NUMBER);
  if (!fromNumbers) return to;

  let index = 0;
  return to.replace(PATH_NUMBER, (value) => {
    const start = Number(fromNumbers[index++]);
    const end = Number(value);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return value;
    return String(Math.round((start + (end - start) * progress) * 1000) / 1000);
  });
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
