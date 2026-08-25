import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const examples = [
  new URL("../react/main.tsx", import.meta.url),
  new URL("../vue/main.ts", import.meta.url),
  new URL("../angular/main.ts", import.meta.url),
  new URL("../vanilla/main.ts", import.meta.url),
];

const frameworkExamples = [
  {
    entry: new URL("../react/main.tsx", import.meta.url),
    view: new URL("../react/main.tsx", import.meta.url),
  },
  {
    entry: new URL("../vue/main.ts", import.meta.url),
    view: new URL("../vue/main.ts", import.meta.url),
  },
  {
    entry: new URL("../angular/main.ts", import.meta.url),
    view: new URL("../angular/main.ts", import.meta.url),
  },
  {
    entry: new URL("../vanilla/main.ts", import.meta.url),
    view: new URL("../vanilla/index.html", import.meta.url),
  },
];

describe("multi-framework playground", () => {
  test("demonstrates the same three-step scenario in every framework", () => {
    for (const example of examples) {
      const source = readFileSync(example, "utf8");
      assert.match(source, /-tour-id-1/);
      assert.match(source, /-tour-id-2/);
      assert.match(source, /-tour-id-3/);
      assert.match(source, /allowInteraction: true/);
    }
  });

  test("does not use the removed previous API", () => {
    const source = examples.map((example) => readFileSync(example, "utf8")).join("\n");
    assert.equal(source.includes("PreviousTrigger"), false);
    assert.equal(source.includes("previousLabel"), false);
  });

  test("uses the default theme without exposing the internal pointer wrapper", () => {
    for (const example of frameworkExamples) {
      const entry = readFileSync(example.entry, "utf8");
      const view = readFileSync(example.view, "utf8");

      assert.match(entry, /import "@glowhop\/styles-tour\/default\.css"/);
      assert.doesNotMatch(view, /data-glow-tour-pointer-content/);
      assert.doesNotMatch(view, /class(?:Name)?=["'][^"']*\btour-pointer\b/);
    }
  });

  test("does not override React tour components with playground classes", () => {
    const reactSource = readFileSync(frameworkExamples[0].view, "utf8");

    assert.doesNotMatch(
      reactSource,
      /<GlowTour\.(?:Pointer|Popover|Header|Content|Footer|BackTrigger|NextTrigger)[^>]*className=/,
    );
  });
});
