import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

describe("website URLs", () => {
  // Every page is served from a directory, so "/vue" answers with a redirect to "/vue/". Internal
  // links written without the slash cost every visitor and crawler that redirect.
  const internalLink =
    /(?:href=|\]\(|link: |href: |path: |goTo\([^)]*)"?(\/[A-Za-z0-9/_-]*[A-Za-z0-9_-])(?=[#")\s])/g;

  test("internal links end with a slash", async () => {
    const offenders: string[] = [];
    for await (const file of new Glob("**/*.{astro,ts,tsx,md,mdx}").scan(import.meta.dir)) {
      if (file.endsWith(".test.ts")) continue;
      const source = await Bun.file(`${import.meta.dir}/${file}`).text();
      for (const match of source.matchAll(internalLink)) offenders.push(`${file}: ${match[1]}`);
    }
    expect(offenders).toEqual([]);
  });

  test("every comparison the site links to has a page and a social card", async () => {
    const { COMPETITOR_KEYS, getLibrary } = await import("./lib/comparison");

    for (const key of COMPETITOR_KEYS) {
      const path = getLibrary(key).path ?? "";
      const slug = path.slice(1, -1);
      expect(await Bun.file(`${import.meta.dir}/pages/${slug}.astro`).exists()).toBe(true);
      const card = `${import.meta.dir}/../public/og/${slug.replace(/^glowtour-/, "")}.jpg`;
      expect(await Bun.file(card).exists()).toBe(true);
    }
  });
});
