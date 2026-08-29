import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { type AdapterRootBinding, connectGlowTourRoot } from "./adapter";
import type { GlowTour } from "./index";

const BRIDGE_SYMBOL = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");

function binding(): AdapterRootBinding {
  return {
    bindOverlay: () => () => {},
    bindPointer: () => () => {},
    bindPopover: () => () => {},
    ids: {
      description: "test-description",
      popover: "test-popover",
      root: "test-root",
      title: "test-title",
    },
    release() {},
  };
}

describe("core adapter entry", () => {
  test("exports only connectGlowTourRoot at runtime", async () => {
    const runtime = await import("./adapter");

    assert.deepEqual(Object.keys(runtime), ["connectGlowTourRoot"]);
  });

  test("rejects a tour without a compatible adapter bridge", () => {
    assert.throws(
      () => connectGlowTourRoot({} as GlowTour<unknown>, { root: {} as HTMLElement }),
      /incompatible Glow Tour adapter bridge/i,
    );
  });

  test("rejects a bridge with an incompatible version", () => {
    const tour = Object.defineProperty({}, BRIDGE_SYMBOL, {
      value: { connectRoot() {}, version: 2 },
    }) as GlowTour<unknown>;

    assert.throws(
      () => connectGlowTourRoot(tour, { root: {} as HTMLElement }),
      /incompatible Glow Tour adapter bridge/i,
    );
  });

  test("rejects a bridge without a callable root connector", () => {
    const missingConnector = Object.defineProperty({}, BRIDGE_SYMBOL, {
      value: { version: 1 },
    }) as GlowTour<unknown>;
    const invalidConnector = Object.defineProperty({}, BRIDGE_SYMBOL, {
      value: { connectRoot: null, version: 1 },
    }) as GlowTour<unknown>;

    for (const tour of [missingConnector, invalidConnector]) {
      assert.throws(
        () => connectGlowTourRoot(tour, { root: {} as HTMLElement }),
        /incompatible Glow Tour adapter bridge/i,
      );
    }
  });

  test("forwards a root and optional prefix to the compatible bridge", () => {
    const root = {} as HTMLElement;
    const expectedBinding = binding();
    let received: unknown;
    const tour = Object.defineProperty({}, BRIDGE_SYMBOL, {
      enumerable: false,
      value: {
        connectRoot(options: unknown) {
          received = options;
          return expectedBinding;
        },
        version: 1,
      },
    }) as GlowTour<unknown>;

    const result = connectGlowTourRoot(tour, { idPrefix: "product-tour", root });

    assert.equal(result, expectedBinding);
    assert.deepEqual(received, { idPrefix: "product-tour", root });
  });
});
