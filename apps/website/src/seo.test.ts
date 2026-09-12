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
