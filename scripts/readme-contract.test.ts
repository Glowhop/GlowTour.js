import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { expect, test } from "bun:test";

const root = resolve(import.meta.dir, "..");
const packages = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;
const read = (path: string) => readFileSync(join(root, path), "utf8");

const canonicalIds = ["core-workflow", "react-quick-start", "react-advanced", "vue-quick-start", "vue-advanced", "angular-quick-start", "angular-advanced", "solid-quick-start", "solid-advanced", "vanilla-quick-start", "vanilla-advanced"] as const;
const marker = /<!--\s*glow-tour:snippet\s+([\w-]+)\s*-->\s*```([\w-]*)\s*\n([\s\S]*?)\n```/g;

function canonicalSnippets() {
  const snippets = new Map<string, { file: string; language: string; source: string }>();
  for (const file of ["README.md", ...packages.map((id) => `packages/${id}/README.md`)]) {
    const source = read(file);
    for (const match of source.matchAll(marker)) {
      const [, id, language, snippet] = match;
      expect(snippets.has(id)).toBe(false);
      snippets.set(id, { file, language, source: snippet });
    }
  }
  expect([...snippets.keys()].sort()).toEqual([...canonicalIds].sort());
  return snippets;
}

function assertLocalLinks(file: string, source: string) {
  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].trim();
    if (/^https?:\/\//.test(href)) continue;
    const [pathname, anchor] = href.split("#", 2);
    const targetFile = pathname ? resolve(root, dirname(file), pathname) : resolve(root, file);
    expect(existsSync(targetFile), `${file} links to missing ${href}`).toBe(true);
    if (anchor) {
      const target = readFileSync(targetFile, "utf8");
      const headings = [...target.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) =>
        heading[1].toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"),
      );
      expect(headings, `${file} links to missing anchor ${href}`).toContain(anchor.toLowerCase());
    }
  }
}

test("the root README is a concise portal with current contracts", () => {
  const readme = read("README.md");
  expect(readme).toContain("@glowhop/react-tour");
  expect(readme).toContain("@glowhop/styles-tour/default.css");
  expect(readme).toContain("docs/compatibility.md");
  expect(readme).not.toContain("updateCurrentStep");
  expect(readme).not.toContain("project.md");
  expect(readme).not.toContain("50 ms");
});

test("each public package has distinct documentation", () => {
  const readmes = packages.map((id) => {
    const path = `packages/${id}/README.md`;
    expect(existsSync(join(root, path))).toBe(true);
    return read(path);
  });
  expect(new Set(readmes).size).toBe(packages.length);
  for (const [index, readme] of readmes.entries()) {
    expect(readme).toContain("ESM-only");
    expect(readme.toLowerCase()).toContain("compatibility");
    expect(readme.toLowerCase()).toContain("ssr");
    expect(readme.toLowerCase()).toContain("hydration");
    assertLocalLinks(`packages/${packages[index]}/README.md`, readme);
  }
  assertLocalLinks("README.md", read("README.md"));
});

test("canonical snippets are uniquely marked and complete", () => {
  const snippets = canonicalSnippets();
  expect(snippets.get("core-workflow")?.language).toBe("ts");
  for (const id of ["react-quick-start", "react-advanced", "solid-quick-start", "solid-advanced"]) expect(snippets.get(id)?.language).toBe("tsx");
  for (const id of ["vue-quick-start", "vue-advanced"]) expect(snippets.get(id)?.language).toBe("vue");
  for (const id of ["angular-quick-start", "angular-advanced", "vanilla-quick-start", "vanilla-advanced"]) expect(snippets.get(id)?.language).toBe("ts");
  for (const { source } of snippets.values()) expect(source.trim().length).toBeGreaterThan(0);
});

test("adapter guides cover the documented quick-start and advanced concerns", () => {
  for (const id of ["react", "vue", "angular", "solid", "vanilla"] as const) {
    const readme = read(`packages/${id}/README.md`);
    for (const term of ["Dynamic", "placement", "interaction", "scroll", "callback", "cancel", "cleanup"]) {
      expect(readme.toLowerCase()).toContain(term.toLowerCase());
    }
  }
  expect(read("packages/react/README.md")).toContain("<button type=\"button\" onClick={() => void tour.run(workflow)}>");
  expect(read("packages/vue/README.md")).toContain("@click=\"start\"");
  expect(read("packages/angular/README.md")).toContain('<button type="button" (click)="start()">');
  expect(read("packages/angular/README.md")).toContain('<glow-tour-default [tour]="tour" />');
  expect(read("packages/solid/README.md")).toContain("onClick={() => void tour.run(workflow)}");
  expect(read("packages/vanilla/README.md")).toContain("startButton.addEventListener(\"click\"");
});

test("package builds require package-local READMEs", () => {
  expect(read("scripts/build-packages.ts")).toContain("Missing package README");
  expect(read("scripts/build-packages.ts")).toContain('join(packageDirectory, "README.md")');
  expect(read("scripts/build-packages.ts")).not.toContain('join(root, "README.md")');
});
