import { afterEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { roundedRectPath, viewportDimensions } from "./utils";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
});

function stubGlobals(documentElement: unknown, view: unknown) {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { defaultView: view, documentElement },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: view });
}

describe("roundedRectPath", () => {
  test("aligns every serialized coordinate to the device pixel grid", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { devicePixelRatio: 2 },
    });

    const path = roundedRectPath(
      {
        bottom: 60.52,
        height: 40.26,
        left: 10.26,
        right: 40.52,
        top: 20.26,
        width: 30.26,
        x: 10.26,
        y: 20.26,
        toJSON: () => ({}),
      },
      { height: 80.26, width: 100.26 },
      { padding: 2.1, radius: 3.1 },
    );

    assert.equal(
      path,
      "M0,0 H100.5 V80.5 H0 Z M8,21 Q8,18 11,18 H39.5 Q42.5,18 42.5,21 V59.5 Q42.5,62.5 39.5,62.5 H11 Q8,62.5 8,59.5 Z",
    );
  });
});

describe("viewportDimensions", () => {
  test("measures the layout viewport, not the visual one", () => {
    // A mobile URL bar shrinks `innerHeight`, a desktop scrollbar shrinks the
    // usable width: neither matches the box a fixed element is sized against.
    stubGlobals({ clientHeight: 844, clientWidth: 375 }, { innerHeight: 750, innerWidth: 390 });

    assert.deepEqual(viewportDimensions(), { height: 844, width: 375 });
  });

  test("falls back to the window when the document cannot be measured", () => {
    stubGlobals({ clientHeight: 0, clientWidth: 0 }, { innerHeight: 750, innerWidth: 390 });

    assert.deepEqual(viewportDimensions(), { height: 750, width: 390 });
  });

  test("falls back again when there is no window at all", () => {
    stubGlobals(null, undefined);

    assert.deepEqual(viewportDimensions(), { height: 768, width: 1024 });
  });
});
