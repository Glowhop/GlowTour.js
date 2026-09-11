import { describe, expect, test } from "bun:test";
import measurements from "../apps/website/src/data/bundle-sizes.json";
import {
  ADAPTER_SCENARIO,
  CORE_SCENARIO,
  STYLES_SCENARIO,
} from "../apps/website/src/lib/bundle-sizes";
import { bundleScenarios } from "./verify-bundles";

/**
 * The website publishes these numbers as fact, so the two ends have to stay wired together:
 * renaming a scenario here must fail loudly rather than leave a blank cell on the page, and the
 * committed measurements have to cover everything the page asks for.
 */

const referenced = [...Object.values(ADAPTER_SCENARIO), CORE_SCENARIO, STYLES_SCENARIO];

describe("website bundle sizes", () => {
  const known = new Set(bundleScenarios.map((scenario) => scenario.name));

  test.each(referenced)("%s is a real bundle scenario", (name) => {
    expect(known.has(name)).toBe(true);
  });

  test.each(referenced)("%s has a committed measurement", (name) => {
    const value = (measurements as Record<string, number>)[name];
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThan(0);
  });
});
