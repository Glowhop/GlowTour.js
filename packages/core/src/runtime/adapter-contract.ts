export const ADAPTER_BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
export const ADAPTER_BRIDGE_VERSION = 1 as const;

export interface AdapterRootIds {
  readonly description: string;
  readonly popover: string;
  readonly root: string;
  readonly title: string;
}

export interface AdapterRootBinding {
  readonly ids: AdapterRootIds;
  bindOverlay(element: SVGSVGElement): () => void;
  bindPointer(element: HTMLElement): () => void;
  bindPopover(element: HTMLElement): () => void;
  release(): void;
}

export interface AdapterRootConnectOptions {
  readonly idPrefix?: string;
  readonly root: HTMLElement;
}

export interface AdapterBridge {
  readonly version: typeof ADAPTER_BRIDGE_VERSION;
  connectRoot(options: AdapterRootConnectOptions): AdapterRootBinding;
}
