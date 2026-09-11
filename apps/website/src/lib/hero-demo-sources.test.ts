import { describe, expect, test } from "bun:test";
import { examples } from "./examples";

/**
 * The snippets in hero-demo-sources.ts are display copies, not imports: they use short ids and
 * trimmed prose so the code beside a demo reads as a standalone example rather than the demo's
 * wired-up internals. That is deliberate, and it is also how the two can drift apart until the
 * code shown next to a running demo no longer describes it.
 *
 * So the contract is one-directional: a snippet may leave things out, but everything it *does*
 * show has to be real. Titles are the anchor a reader uses to line the snippet up with the demo in
 * front of them, which makes a stale title the drift that actually misleads. Contents are excluded
 * on purpose - they are abridged by hand, so no textual rule holds over them without being noise.
 */

/** Option names the snippets cite by name; each must exist in the workflow it describes. */
const CITED_OPTIONS = [
  "allowInteraction",
  "allowScroll",
  "cancellable",
  "disableAdvanceButton",
  "disableAutoFocus",
  "disableAutoScroll",
  "hideFooter",
  "missingTargetStrategy",
  "overlayClick",
  "placementTryOrder",
  "targetTimeout",
] as const;

function quotedTitles(source: string): readonly string[] {
  return [...source.matchAll(/title: "((?:[^"\\]|\\.)*)"/g)].map((match) => match[1]);
}

/** Every option key the definition actually sets, at any depth. */
function definedKeys(value: unknown, seen = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) definedKeys(entry, seen);
    return seen;
  }
  if (typeof value !== "object" || value === null) return seen;
  for (const [key, nested] of Object.entries(value)) {
    seen.add(key);
    definedKeys(nested, seen);
  }
  return seen;
}

describe("hero demo sources", () => {
  for (const example of examples) {
    describe(example.label, () => {
      const titles = example.workflow.steps.map((step) => step.props.title);

      test("quotes at least one step title", () => {
        expect(quotedTitles(example.source).length).toBeGreaterThan(0);
      });

      test("every quoted title is a real step title, in order", () => {
        let next = 0;
        for (const quoted of quotedTitles(example.source)) {
          const index = titles.indexOf(quoted, next);
          expect(
            index,
            `"${quoted}" is shown in the snippet but is not a step title of the running demo, or appears out of order`,
          ).toBeGreaterThan(-1);
          next = index + 1;
        }
      });

      test("shows no more steps than the demo runs", () => {
        // Line-anchored: one snippet mentions ".step()" inside a step's own prose.
        const shown = (example.source.match(/^\s*\.step\(/gm) ?? []).length;
        expect(shown).toBeLessThanOrEqual(example.workflow.steps.length);
      });

      test("every option it names is set by the demo", () => {
        // The whole definition, not just the steps: cancellable and allowScroll are start options.
        const keys = definedKeys(example.workflow);
        for (const option of CITED_OPTIONS) {
          if (!example.source.includes(`${option}:`)) continue;
          expect(keys.has(option), `the snippet names ${option}, the demo never sets it`).toBe(
            true,
          );
        }
      });
    });
  }
});
