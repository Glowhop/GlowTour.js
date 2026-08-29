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

  test("scopes every component selector to a tour root without redeclaring public tokens", () => {
    const publicTokens = [
      "color-accent",
      "color-accent-hover",
      "color-on-accent",
      "color-surface",
      "color-surface-muted",
      "color-text",
      "color-text-muted",
      "color-border",
      "arrow-color",
      "arrow-border-color",
      "radius",
      "shadow",
      "transition-duration",
      "transition-easing",
    ];

    assert.doesNotMatch(stylesheet, /:root\b/);

    for (const token of publicTokens) {
      assert.doesNotMatch(
        stylesheet,
        new RegExp(`--glow-tour-${token}:`),
        `does not redeclare --glow-tour-${token}`,
      );
    }

    assert.doesNotMatch(stylesheet, /(^|}|,)\s*\[data-glow-tour-/);
    assert.match(stylesheet, /^:where\(\[data-glow-tour-root\]\) \[data-glow-tour-popover\]/m);
  });

  test("uses inherited public token fallbacks at their scoped points of use", () => {
    const tokensWithFallbacks = [
      "color-accent",
      "color-accent-hover",
      "color-on-accent",
      "color-surface",
      "color-surface-muted",
      "color-text",
      "color-text-muted",
      "color-border",
      "radius",
      "shadow",
      "transition-duration",
      "transition-easing",
    ];

    for (const token of tokensWithFallbacks) {
      assert.match(
        stylesheet,
        new RegExp(`var\\(--glow-tour-${token},\\s*[^)]+\\)`),
        `uses --glow-tour-${token} with a fallback`,
      );
    }
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
    assert.match(stylesheet, /var\(--glow-tour-radius,\s*8px\)/);
    assert.match(stylesheet, /var\(--glow-tour-shadow,\s*0 4px 12px rgb\(0 0 0 \/ 8%\)\)/);
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

  test("keeps the popover readable when viewport space or content is constrained", () => {
    assert.match(stylesheet, /width:\s*min\(/);
    assert.match(
      stylesheet,
      /max-height:\s*calc\(100dvh - \(var\(--glow-tour-viewport-gap,\s*16px\) \* 2\)\)/,
    );
    assert.match(stylesheet, /overflow-y:\s*auto/);
    assert.match(stylesheet, /overscroll-behavior:\s*contain/);
    assert.match(stylesheet, /overflow-wrap:\s*anywhere/);
    assert.match(stylesheet, /flex-wrap:\s*wrap/);
  });

  test("styles cancel, previous, and advance controls across interaction states", () => {
    const controls = ["cancel", "previous", "advance"] as const;

    for (const control of controls) {
      assert.match(stylesheet, new RegExp(`data-glow-tour-${control}-trigger`));
      assert.match(
        stylesheet,
        new RegExp(
          `data-glow-tour-${control}-trigger[^}]*:focus-visible|data-glow-tour-${control}-trigger]:focus-visible`,
          "s",
        ),
      );
      assert.match(
        stylesheet,
        new RegExp(
          `data-glow-tour-${control}-trigger[^}]*:disabled|data-glow-tour-${control}-trigger]:disabled`,
          "s",
        ),
      );
    }

    assert.match(
      stylesheet,
      /\[data-glow-tour-cancel-trigger\][^{]*\{[^}]*margin-inline-end:\s*auto/s,
    );
    assert.match(
      stylesheet,
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*data-glow-tour-cancel-trigger[\s\S]*data-glow-tour-previous-trigger[\s\S]*data-glow-tour-advance-trigger/,
    );
    assert.match(stylesheet, /@media \(forced-colors:\s*active\)[\s\S]*:focus-visible/);
  });

  test("exposes arrow theme variables without owning its pseudo-element", () => {
    assert.doesNotMatch(stylesheet, /--glow-tour-arrow-color:/);
    assert.doesNotMatch(stylesheet, /--glow-tour-arrow-border-color:/);
    assert.doesNotMatch(stylesheet, /\[data-glow-tour-popover[^}]*::before/);
  });
});
