import {
  ADAPTER_BRIDGE_SYMBOL,
  ADAPTER_BRIDGE_VERSION,
  type AdapterBridge,
  type AdapterRootBinding,
  type AdapterRootIds,
} from "./runtime/adapter-contract";
import type { GlowTour } from "./types";

export type { AdapterRootBinding, AdapterRootIds };

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
    throw new Error("Incompatible Glow Tour adapter bridge");
  }
  return (bridge as AdapterBridge).connectRoot(options);
}
