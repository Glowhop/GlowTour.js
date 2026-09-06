import {
  type CssStyleRecord,
  OVERLAY_IDLE_ATTRIBUTES,
  OVERLAY_IDLE_STYLE,
  OVERLAY_PATH_IDLE_ATTRIBUTES,
  POINTER_IDLE_ATTRIBUTES,
  POINTER_IDLE_STYLE,
  POPOVER_IDLE_ATTRIBUTES,
  POPOVER_IDLE_STYLE,
  styleRecordToCamelCase,
  styleRecordToCssText,
} from "./elements/idle-presentation";
import {
  ADAPTER_BRIDGE_SYMBOL,
  ADAPTER_BRIDGE_VERSION,
  type AdapterBridge,
  type AdapterRootBinding,
  type AdapterRootIds,
} from "./runtime/adapter-contract";
import type { GlowTour } from "./types";

export type { AdapterRootBinding, AdapterRootIds, CssStyleRecord };

/**
 * The idle (pre-bind / server-rendered) presentation for tour elements.
 *
 * Framework adapters render these directly into their markup so the popover,
 * pointer and overlay are out of flow and invisible before a tour's runtime
 * ever touches the DOM — on the server, and in the window between hydration
 * and an adapter binding its elements. `initializeProps()` on the
 * corresponding core element classes applies the same constants
 * imperatively, so rendered markup and runtime application can never drift.
 *
 * Excludes the overlay's `viewBox`, which depends on the live viewport and
 * can only be computed once the element exists in a real DOM.
 */
export {
  OVERLAY_IDLE_ATTRIBUTES,
  OVERLAY_IDLE_STYLE,
  OVERLAY_PATH_IDLE_ATTRIBUTES,
  POINTER_IDLE_ATTRIBUTES,
  POINTER_IDLE_STYLE,
  POPOVER_IDLE_ATTRIBUTES,
  POPOVER_IDLE_STYLE,
  styleRecordToCamelCase,
  styleRecordToCssText,
};

/**
 * Connects a GlowTour.js instance to a DOM root element.
 *
 * Framework adapters call this to initialize tour UI bindings. It must be called
 * with a valid GlowTour instance created via createGlowTour.
 *
 * @param tour The GlowTour instance.
 * @param options Configuration for the adapter root binding.
 * @param options.root The DOM element where tour UI will be rendered.
 * @param options.idPrefix Optional prefix for internal element IDs.
 * @returns The adapter root binding for managing the tour UI.
 * @throws Throws if the tour is not a valid GlowTour instance.
 */
export function connectGlowTourRoot<T>(
  tour: GlowTour<T>,
  options: { readonly idPrefix?: string; readonly root: HTMLElement },
): AdapterRootBinding {
  const bridge: unknown = Reflect.get(tour, ADAPTER_BRIDGE_SYMBOL);
  if (
    typeof bridge !== "object" ||
    bridge === null ||
    Reflect.get(bridge, "version") !== ADAPTER_BRIDGE_VERSION ||
    typeof Reflect.get(bridge, "connectRoot") !== "function"
  ) {
    throw new Error("Incompatible GlowTour.js adapter bridge");
  }
  return (bridge as AdapterBridge).connectRoot(options);
}
