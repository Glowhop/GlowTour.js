import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { mergeIndicatorOptions } from "./options";

describe("mergeIndicatorOptions", () => {
  test("inherits and overrides the indicator gap", () => {
    assert.equal(mergeIndicatorOptions({ gap: 20 }, undefined)?.gap, 20);
    assert.equal(mergeIndicatorOptions({ gap: 20 }, { gap: 8 })?.gap, 8);
    assert.equal(mergeIndicatorOptions(undefined, { gap: -8 })?.gap, 0);
  });
});
