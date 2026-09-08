import { afterEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  canInterpolatePathData,
  interpolatePathData,
  paintedBoxDimensions,
  roundedRectPath,
  viewportDimensions,
} from "./utils";

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

describe("paintedBoxDimensions", () => {
  test("measures the element rather than the layout viewport", () => {
    // The mismatch this exists for: a mobile URL bar has moved the layout
    // viewport away from the initial containing block the overlay is sized
    // against, so `clientHeight` would leave an undimmed band at the bottom.
    stubGlobals({ clientHeight: 750, clientWidth: 390 }, { innerHeight: 750, innerWidth: 390 });
    const element = {
      getBoundingClientRect: () => ({ height: 844, width: 390 }),
    } as unknown as Element;

    assert.deepEqual(paintedBoxDimensions(element), { height: 844, width: 390 });
  });

  test("falls back to the viewport for an element that has no box yet", () => {
    stubGlobals({ clientHeight: 844, clientWidth: 375 }, { innerHeight: 750, innerWidth: 390 });
    const element = {
      getBoundingClientRect: () => ({ height: 0, width: 0 }),
    } as unknown as Element;

    assert.deepEqual(paintedBoxDimensions(element), { height: 844, width: 375 });
  });

  test("falls back to the viewport when the element cannot be measured", () => {
    stubGlobals({ clientHeight: 844, clientWidth: 375 }, { innerHeight: 750, innerWidth: 390 });

    assert.deepEqual(paintedBoxDimensions(null), { height: 844, width: 375 });
  });
});

describe("path interpolation", () => {
  const from = "M0,0 H800 V600 H0 Z M92,92 Q92,92 100,92";
  const to = "M0,0 H800 V600 H0 Z M192,192 Q192,192 200,192";

  test("interpolates every operand of two structurally identical paths", () => {
    assert.equal(canInterpolatePathData(from, to), true);
    assert.equal(
      interpolatePathData(from, to, 0.5),
      "M0,0 H800 V600 H0 Z M142,142 Q142,142 150,142",
    );
  });

  test("returns the endpoints exactly", () => {
    assert.equal(interpolatePathData(from, to, 0), from);
    assert.equal(interpolatePathData(from, to, 1), to);
  });

  test("interpolates negative operands packed against their command", () => {
    assert.equal(interpolatePathData("h-100 v-20", "h-200 v-40", 0.5), "h-150 v-30");
  });

  test("treats commas and whitespace as the same separator", () => {
    // `getComputedStyle` hands back a path spaced the way the engine likes it,
    // which is never the way `roundedRectPath` serialized the other side.
    assert.equal(canInterpolatePathData("M 0 0 H 800", "M0,0 H800"), true);
    assert.equal(interpolatePathData("M 0 0 H 800", "M0,0 H400", 0.5), "M0,0 H600");
  });

  test("refuses paths whose commands differ", () => {
    assert.equal(canInterpolatePathData("M0,0 H10", "M0,0 L10,0"), false);
    assert.equal(canInterpolatePathData("", to), false);
    assert.equal(canInterpolatePathData(from, ""), false);
  });
});
