import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const examples = [
  new URL("../react/main.tsx", import.meta.url),
  new URL("../vue/main.ts", import.meta.url),
  new URL("../angular/main.ts", import.meta.url),
  new URL("../vanilla/main.ts", import.meta.url),
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
});
