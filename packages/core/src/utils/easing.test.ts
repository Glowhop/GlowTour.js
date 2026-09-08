import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { cssEasing } from "./easing";

/** Bézier inversion is iterative; a subpixel tolerance is the point of it. */
function assertClose(actual: number, expected: number, tolerance = 1e-3) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

describe("cssEasing", () => {
  test("pins both endpoints for every curve", () => {
    for (const easing of [
      "linear",
      "ease",
      "ease-in",
      "ease-out",
      "cubic-bezier(0.4, 0, 0.2, 1)",
    ]) {
      const ease = cssEasing(easing);
      assert.equal(ease(0), 0);
      assert.equal(ease(1), 1);
    }
  });

  test("front-loads ease-out and back-loads ease-in", () => {
    assert.ok(cssEasing("ease-out")(0.25) > 0.25);
    assert.ok(cssEasing("ease-in")(0.25) < 0.25);
  });

  test("evaluates a symmetric curve at its midpoint", () => {
    assertClose(cssEasing("ease-in-out")(0.5), 0.5);
    assertClose(cssEasing("cubic-bezier(0.4, 0, 0.6, 1)")(0.5), 0.5);
  });

  test("inverts the x axis rather than treating progress as the parameter", () => {
    // For cubic-bezier(0, 0, 0.58, 1) at x = 0.5, the curve parameter is well
    // past 0.5; reading y at t = progress would understate the easing.
    assertClose(cssEasing("ease-out")(0.5), 0.7, 0.02);
  });

  test("is case- and whitespace-insensitive", () => {
    assert.equal(cssEasing("  EASE-OUT ")(0.5), cssEasing("ease-out")(0.5));
  });

  test("falls back to linear for anything it cannot evaluate", () => {
    for (const easing of [undefined, "", "steps(4, end)", "cubic-bezier(0.4, 0)", "spring(1 2)"]) {
      assert.equal(cssEasing(easing)(0.25), 0.25);
    }
  });

  test("clamps progress outside the unit interval", () => {
    const ease = cssEasing("ease-in-out");
    assert.equal(ease(-1), 0);
    assert.equal(ease(2), 1);
  });
});
