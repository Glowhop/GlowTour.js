import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareApiReports,
  findInvalidReportReferences,
  generateApiReports,
  reportPath,
} from "./api-report";

const root = process.cwd();
let reports: Map<string, string> | undefined;
const currentReports = () => {
  reports ??= generateApiReports(root);
  return reports;
};

test("keeps the committed public API reports in sync with the sources", () => {
  const { changed, stale } = compareApiReports(root, currentReports());
  if (changed.length > 0 || stale.length > 0) {
    throw new Error(
      `Public API reports are out of date: ${[...changed, ...stale].join(", ")}. Run \`bun run api:report\` and review the diff in api/.`,
    );
  }
}, 60_000);

test("reports every TypeScript entry point that a public package exports", () => {
  const expected = readdirSync(join(root, "packages"))
    .map((directory) => join(root, "packages", directory, "package.json"))
    .filter((manifestPath) => existsSync(manifestPath))
    .map((manifestPath) => JSON.parse(readFileSync(manifestPath, "utf8")))
    .filter((manifest) => manifest.private !== true)
    .flatMap((manifest) =>
      Object.keys(manifest.exports ?? {})
        .filter((key) => !key.endsWith(".css"))
        .map((key) => reportPath(key === "." ? manifest.name : `${manifest.name}/${key.slice(2)}`)),
    )
    .sort();

  expect(expected.length).toBeGreaterThan(0);
  expect([...currentReports().keys()].sort()).toEqual(expected);
}, 60_000);

test("names report files after the package and its subpath", () => {
  expect(reportPath("@glowhop/core-tour")).toBe("api/core-tour/index.api.md");
  expect(reportPath("@glowhop/vanilla-tour/auto")).toBe("api/vanilla-tour/auto.api.md");
  expect(() => reportPath("react")).toThrow("Unexpected package entry specifier");
});

test("names only types that each report imports, exports, or declares", () => {
  expect(findInvalidReportReferences(root, currentReports())).toEqual([]);
}, 60_000);
