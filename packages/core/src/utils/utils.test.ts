import { afterEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { roundedRectPath } from "./utils";

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

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
