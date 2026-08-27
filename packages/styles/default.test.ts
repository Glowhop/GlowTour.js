import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(new URL("./default.css", import.meta.url), "utf8");
const packageManifest = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

describe("default tour theme", () => {
  test("publishes the stylesheet as the package side effect", () => {
    assert.deepEqual(packageManifest.files, ["dist/**/*"]);
    assert.deepEqual(packageManifest.sideEffects, ["*.css"]);
  });

  test("exposes the shared theme tokens and component selectors", () => {
    assert.match(stylesheet, /--glow-tour-color-accent:\s*#4c35fd/);
    assert.match(stylesheet, /\[data-glow-tour-popover\]/);
    assert.match(stylesheet, /\[data-glow-tour-header\]/);
    assert.match(stylesheet, /\[data-glow-tour-content\]/);
    assert.match(stylesheet, /\[data-glow-tour-footer\]/);
    assert.match(stylesheet, /\[data-glow-tour-previous-trigger\]/);
    assert.match(stylesheet, /\[data-glow-tour-next-trigger\]/);
    assert.match(stylesheet, /\[data-glow-tour-pointer-content\]/);
  });

  test("transforms application-provided pointer content for every placement", () => {
    const transforms = {
      top: "rotate(180deg)",
      bottom: "rotate(0deg)",
      left: "scaleX(-1) rotate(-90deg)",
      right: "rotate(-90deg)",
    } as const;

    for (const [placement, transform] of Object.entries(transforms)) {
      assert.match(
        stylesheet,
        new RegExp(
          `data-glow-tour-placement=["']${placement}["'][\\s\\S]*?transform:\\s*${transform.replace(/[()]/g, "\\$&")}`,
        ),
      );
    }
  });

  test("keeps the default theme minimal and motionless", () => {
    assert.match(stylesheet, /--glow-tour-radius:\s*8px/);
    assert.match(stylesheet, /--glow-tour-shadow:\s*0 4px 12px rgb\(0 0 0 \/ 8%\)/);
    assert.doesNotMatch(stylesheet, /border-radius:\s*999px/);
    assert.doesNotMatch(stylesheet, /color-mix\(/);
    assert.doesNotMatch(stylesheet, /filter:\s*drop-shadow/);
    assert.doesNotMatch(stylesheet, /transform:\s*translateY/);

    const pointerContentRule = stylesheet.match(
      /\[data-glow-tour-pointer-content\]\s*\{(?<declarations>[^}]*)\}/,
    );

    assert.ok(pointerContentRule?.groups?.declarations);
    assert.doesNotMatch(pointerContentRule.groups.declarations, /transition/);
  });

  test("covers keyboard focus, disabled controls and reduced motion", () => {
    assert.match(stylesheet, /:focus-visible/);
    assert.match(stylesheet, /:disabled|\[disabled\]/);
    assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  });

  test("exposes arrow theme variables without owning its pseudo-element", () => {
    assert.match(stylesheet, /--glow-tour-arrow-color:\s*var\(--glow-tour-color-surface\)/);
    assert.match(stylesheet, /--glow-tour-arrow-border-color:\s*var\(--glow-tour-color-border\)/);
    assert.doesNotMatch(stylesheet, /\[data-glow-tour-popover[^}]*::before/);
  });
});
