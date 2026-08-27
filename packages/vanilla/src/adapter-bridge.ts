const ADAPTER_BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");

export interface RootBinding {
  readonly ids: Readonly<{
    description: string;
    popover: string;
    root: string;
    title: string;
  }>;
  bindOverlay(element: SVGSVGElement): () => void;
  bindPointer(element: HTMLElement): () => void;
  bindPopover(element: HTMLElement): () => void;
  release(): void;
}

interface AdapterBridge {
  readonly version: 1;
  connectRoot(options: { adapter: unknown; idPrefix?: string; root: HTMLElement }): RootBinding;
}

export const vanillaAdapter = Object.freeze({ framework: "vanilla" });

export function getAdapterBridge(tour: object): AdapterBridge {
  const bridge: unknown = Reflect.get(tour, ADAPTER_BRIDGE_SYMBOL);
  if (
    typeof bridge !== "object" ||
    bridge === null ||
    Reflect.get(bridge, "version") !== 1 ||
    typeof Reflect.get(bridge, "connectRoot") !== "function"
  ) {
    throw new Error("Incompatible @glowhop/core-tour adapter bridge");
  }
  return bridge as AdapterBridge;
}
