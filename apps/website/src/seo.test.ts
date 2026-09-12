import { describe, expect, test } from "bun:test";

const pageSource = (name: string) => Bun.file(`${import.meta.dir}/pages/${name}.astro`).text();

describe("website SEO targeting", () => {
  test("home targets product tours and user onboarding", async () => {
    const source = await pageSource("index");

    expect(source).toContain(
      'title="GlowTour.js - Product Tour & Onboarding Library for JavaScript"',
    );
    expect(source.toLowerCase()).toContain("product tours");
    expect(source.toLowerCase()).toContain("user onboarding");
  });

  const comparisonPages = [
    ["glowtour-vs-driver-js", "Driver.js"],
    ["glowtour-vs-shepherd-js", "Shepherd.js"],
    ["glowtour-vs-react-joyride", "React Joyride"],
  ] as const;

  for (const [page, competitor] of comparisonPages) {
    test(`${competitor} comparison page targets "GlowTour.js vs ${competitor}"`, async () => {
      const source = await pageSource(page);

      expect(source).toContain(
        `title="GlowTour.js vs ${competitor} - Product Tour Library Comparison"`,
      );
      expect(source).toContain(`Should you choose GlowTour.js or ${competitor}?`);
    });
  }

  test("compare page targets competing product tour libraries", async () => {
    const source = await pageSource("compare");

    expect(source).toContain('title="GlowTour.js vs Driver.js, Shepherd.js & React Joyride"');
    expect(source).toContain("Which product tour library should you choose?");
  });

  test("home links its compact comparison to /compare", async () => {
    const source = await pageSource("index");

    expect(source).toContain('href="/compare"');
    expect(source).toContain("See full comparison");
  });

  test("every comparison path the footer links to has a page", async () => {
    const { COMPETITOR_KEYS, getLibrary } = await import("./lib/comparison");
    const footer = await Bun.file(`${import.meta.dir}/components/Footer.astro`).text();

    expect(footer).toContain('href="/compare"');
    for (const key of COMPETITOR_KEYS) {
      const path = getLibrary(key).path ?? "";
      expect(await Bun.file(`${import.meta.dir}/pages${path}.astro`).exists()).toBe(true);
    }
  });

  const frameworkPages = [
    ["react", "React"],
    ["vue", "Vue"],
    ["solid", "Solid"],
    ["angular", "Angular"],
    ["vanilla", "Vanilla JavaScript"],
  ] as const;

  for (const [page, framework] of frameworkPages) {
    test(`${framework} page targets product tours while retaining guided-tour wording`, async () => {
      const source = await pageSource(page);

      expect(source).toContain(`title="${framework} Product Tour Library - GlowTour.js"`);
      expect(source.toLowerCase()).toContain("product tour");
      expect(source.toLowerCase()).toContain("guided");
    });
  }
});
