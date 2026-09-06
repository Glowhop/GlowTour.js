/**
 * Single source of truth for the "idle" presentation of tour elements — the
 * out-of-flow, invisible layout each element must have before a tour ever
 * runs (or before an adapter's runtime has bound to the DOM at all).
 *
 * `initializeProps()` on {@link OverlayElement}, {@link PointerElement} and
 * {@link PopoverElement} applies these same constants imperatively once an
 * adapter binds an element. Framework adapters render them directly into
 * their markup (server and client alike) so the idle state holds even
 * before hydration/binding runs, with no dependency on `@glowhop/styles-tour`
 * or any other optional theme.
 *
 * Deliberately excluded: the overlay's `viewBox`, which depends on the live
 * viewport and can only be computed once the element exists in a real DOM.
 */

/** A CSS declaration block keyed by kebab-case property names. */
export type CssStyleRecord = Readonly<Record<string, string>>;

/** Idle inline style for the overlay `<svg>` element. */
export const OVERLAY_IDLE_STYLE: CssStyleRecord = {
  "clip-rule": "evenodd",
  "fill-rule": "evenodd",
  height: "100%",
  left: "0px",
  "pointer-events": "none",
  position: "fixed",
  "stroke-linejoin": "round",
  "stroke-miterlimit": "2",
  top: "0px",
  width: "100%",
  "z-index": "10000",
};

/** Idle attributes for the overlay `<svg>` element. */
export const OVERLAY_IDLE_ATTRIBUTES = {
  "aria-hidden": "true",
  "data-glow-tour-allow-interaction": "false",
  inert: "true",
} as const;

/**
 * Idle attributes for the overlay's cutout `<path>`. Genuinely load-bearing,
 * not dead code: the parent `<svg>` is `pointer-events: none` and
 * `setInteractionAllowed` toggles it, so `pointer-events: auto` here is what
 * makes only the drawn region clickable — what `behavior.overlayClick`
 * depends on.
 */
export const OVERLAY_PATH_IDLE_ATTRIBUTES = {
  cursor: "auto",
  opacity: "0",
  "pointer-events": "auto",
} as const;

/** Idle inline style for the pointer/indicator element. */
export const POINTER_IDLE_STYLE: CssStyleRecord = {
  left: "0px",
  opacity: "0",
  "pointer-events": "none",
  position: "fixed",
  top: "0px",
  "will-change": "top, left, transform, opacity",
  "z-index": "10002",
};

/** Idle attributes for the pointer/indicator element. */
export const POINTER_IDLE_ATTRIBUTES = {
  "aria-hidden": "true",
} as const;

/** Idle inline style for the popover element. */
export const POPOVER_IDLE_STYLE: CssStyleRecord = {
  left: "0px",
  opacity: "0",
  position: "fixed",
  top: "0px",
  "transform-origin": "center center",
  "z-index": "10001",
};

/** Idle attributes for the popover element. */
export const POPOVER_IDLE_ATTRIBUTES = {
  "aria-hidden": "true",
  inert: "true",
  tabindex: "-1",
} as const;

/**
 * Serializes a style record to CSS text, e.g. for a static `style="..."`
 * attribute (Vanilla, Angular).
 */
export function styleRecordToCssText(style: CssStyleRecord): string {
  return Object.entries(style)
    .map(([property, value]) => `${property}: ${value};`)
    .join(" ");
}

/**
 * Converts a kebab-case style record to a camelCase object, as required by
 * React's `style` prop. Vue and Solid accept kebab-case property names
 * directly and can use the canonical record as-is.
 */
export function styleRecordToCamelCase(style: CssStyleRecord): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [property, value] of Object.entries(style)) {
    result[property.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase())] = value;
  }
  return result;
}
