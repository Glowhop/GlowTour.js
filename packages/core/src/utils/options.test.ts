import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { freezeStepProps } from "../definition";
import { mergeIndicatorOptions, mergePopoverOptions, mergeStepProps } from "./options";

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
          hidden: true,
          edgePadding: 18,
          size: 14,
        },
      },
      {
        arrow: {
          color: "#4c35fd",
          hidden: false,
          edgePadding: -8,
          size: 20,
        },
      },
    );

    assert.deepEqual(options?.arrow, {
      borderRadius: 4,
      borderWidth: 2,
      color: "#4c35fd",
      autoStyles: undefined,
      hidden: false,
      edgePadding: -8,
      size: 20,
      styleNonce: undefined,
    });
  });
});

describe("mergeStepProps classNames", () => {
  test("adds the step classes after the workflow ones per component", () => {
    const props = mergeStepProps(
      { classNames: { popover: "tour-popover shared", footer: ["tour-footer"] } },
      {
        content: "content",
        classNames: { popover: ["shared", "step-popover"], header: "step-header" },
      },
      true,
    );

    assert.deepEqual(props.classNames, {
      popover: ["tour-popover shared", "shared", "step-popover"],
      footer: ["tour-footer"],
      header: ["step-header"],
    });
  });

  test("keeps the workflow classes when the step has none", () => {
    const props = mergeStepProps(
      { classNames: { overlay: "tour-overlay" } },
      { content: "c" },
      true,
    );
    assert.deepEqual(props.classNames, { overlay: "tour-overlay" });
  });

  test("replaces the classes of the components a patch names when not joining", () => {
    const props = mergeStepProps(
      { content: "c", classNames: { popover: ["a", "b"], pointer: "p" } },
      { classNames: { popover: "c" } },
    );
    assert.deepEqual(props.classNames, { popover: "c", pointer: "p" });
  });

  test("ignores components set to undefined", () => {
    const props = freezeStepProps(
      mergeStepProps(
        { classNames: { popover: undefined, header: "tour" } },
        { content: "c", classNames: { header: undefined, footer: ["step"] } },
        true,
      ),
    );
    assert.deepEqual(props.classNames, { popover: undefined, header: ["tour"], footer: ["step"] });
  });
});
