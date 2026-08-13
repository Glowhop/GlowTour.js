import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateReleaseArtifacts } from "./prepare-release";

const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;

function writeFixture(root: string, dependencyVersion = "0.2.0") {
  for (const packageId of packageIds) {
    const directory = join(root, "packages", packageId);
    mkdirSync(join(directory, "dist"), { recursive: true });
    const manifest = {
      dependencies:
        packageId === "core" || packageId === "styles"
          ? undefined
          : { "@glowhop/core-tour": dependencyVersion },
      name: `@glowhop/${packageId}-tour`,
      version: "0.2.0",
    };
    writeFileSync(join(directory, "package.json"), `${JSON.stringify(manifest)}\n`);
    writeFileSync(join(directory, "dist", "package.json"), `${JSON.stringify(manifest)}\n`);
  }
}

test("validates source and built internal dependencies against the release version", () => {
  const root = mkdtempSync(join(tmpdir(), "glow-tour-release-fixture-"));
  writeFixture(root, "0.1.0");

  expect(() => validateReleaseArtifacts(root, "0.2.0")).toThrow(
    "@glowhop/react-tour dependency @glowhop/core-tour must match release version 0.2.0",
  );
});

test("accepts a bumped release when source workspace dependencies produce matching built versions", () => {
  const root = mkdtempSync(join(tmpdir(), "glow-tour-release-fixture-"));
  writeFixture(root);
  const reactSourcePath = join(root, "packages", "react", "package.json");
  const reactSource = JSON.parse(readFileSync(reactSourcePath, "utf8")) as { dependencies: Record<string, string> };
  reactSource.dependencies["@glowhop/core-tour"] = "workspace:*";
  writeFileSync(reactSourcePath, `${JSON.stringify(reactSource)}\n`);

  expect(validateReleaseArtifacts(root, "0.2.0")).toEqual(packageIds);
});
