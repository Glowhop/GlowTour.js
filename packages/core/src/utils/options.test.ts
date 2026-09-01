import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { mergeIndicatorOptions, mergePopoverOptions } from "./options";

describe("mergeIndicatorOptions", () => {
  test("inherits and overrides the indicator gap", () => {
    assert.equal(mergeIndicatorOptions({ gap: 20 }, undefined)?.gap, 20);
    assert.equal(mergeIndicatorOptions({ gap: 20 }, { gap: 8 })?.gap, 8);
    assert.equal(mergeIndicatorOptions(undefined, { gap: -8 })?.gap, -8);
  });
});

describe("mergePopoverOptions", () => {
  test("merges arrow overrides field by field without normalizing numeric styles", () => {
    const options = mergePopoverOptions(
      {
        arrow: {
          borderRadius: 4,
          borderWidth: 2,
          color: "var(--workflow-arrow)",
          disabled: true,
          edgePadding: 18,
          size: 14,
        },
      },
      {
        arrow: {
          color: "#4c35fd",
          disabled: false,
          edgePadding: -8,
          size: 20,
        },
      },
    );

    assert.deepEqual(options?.arrow, {
      borderRadius: 4,
      borderWidth: 2,
      color: "#4c35fd",
      disabled: false,
      edgePadding: -8,
      size: 20,
    });
  });
});
