import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "bun:test";

const root = resolve(import.meta.dir, "..");
const packages = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;
const read = (path: string) => readFileSync(join(root, path), "utf8");

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
  for (const readme of readmes) {
    const relativeLinks = [...readme.matchAll(/\[[^\]]+\]\((?!https?:\/\/|#)([^)]+)\)/g)].map(
      (match) => match[1],
    );
    expect(relativeLinks).toEqual([]);
    expect(readme).toContain("ESM-only");
  }
});

test("adapter guides cover the documented quick-start and advanced concerns", () => {
  for (const id of ["react", "vue", "angular", "solid", "vanilla"] as const) {
    const readme = read(`packages/${id}/README.md`);
    for (const term of ["Dynamic", "placement", "interaction", "scroll", "callback", "cancel", "cleanup"]) {
      expect(readme.toLowerCase()).toContain(term.toLowerCase());
    }
  }
});

test("package builds require package-local READMEs", () => {
  expect(read("scripts/build-packages.ts")).toContain("Missing package README");
  expect(read("scripts/build-packages.ts")).toContain('join(packageDirectory, "README.md")');
  expect(read("scripts/build-packages.ts")).not.toContain('join(root, "README.md")');
});
