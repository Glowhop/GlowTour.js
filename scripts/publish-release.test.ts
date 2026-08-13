import { expect, test } from "bun:test";
import { publishRelease, type CommandResult } from "./publish-release";

const packageIds = ["core", "styles", "react", "vue", "angular", "solid", "vanilla"] as const;
const packageNames = packageIds.map((packageId) => `@glowhop/${packageId}-tour`);

function manifest(packageId: (typeof packageIds)[number]) {
  return {
    name: `@glowhop/${packageId}-tour`,
    version: "0.2.0",
  };
}

test("preflights in release order, skips published packages, and publishes only missing packages", () => {
  const calls: string[][] = [];
  const runner = (command: string, args: readonly string[]): CommandResult => {
    calls.push([command, ...args]);
    if (args[0] === "view") {
      return args[1].startsWith("@glowhop/core-tour@")
        ? { exitCode: 0, stderr: "", stdout: "\"0.2.0\"" }
        : { exitCode: 1, stderr: "npm error code E404", stdout: "" };
    }
    return { exitCode: 0, stderr: "", stdout: "" };
  };

  const result = publishRelease({ manifests: packageIds.map(manifest), runner });

  expect(result.skipped).toEqual(["@glowhop/core-tour"]);
  expect(result.published).toEqual(packageNames.slice(1));
  expect(calls.filter((call) => call[1] === "view").map((call) => call[2])).toEqual(
    packageNames.map((packageName) => `${packageName}@0.2.0`),
  );
  expect(calls.filter((call) => call[1] === "publish").map((call) => call[2])).toEqual(
    packageIds.slice(1).map((packageId) => `./packages/${packageId}/dist`),
  );
});

test("stops at the failed publish so a rerun can preflight and resume", () => {
  const calls: string[][] = [];
  const runner = (command: string, args: readonly string[]): CommandResult => {
    calls.push([command, ...args]);
    if (args[0] === "view") return { exitCode: 1, stderr: "npm error code E404", stdout: "" };
    if (args[1] === "./packages/react/dist") return { exitCode: 1, stderr: "network failed", stdout: "" };
    return { exitCode: 0, stderr: "", stdout: "" };
  };

  expect(() => publishRelease({ manifests: packageIds.map(manifest), runner })).toThrow(
    "npm publish ./packages/react/dist --access public failed",
  );
  expect(calls.filter((call) => call[1] === "publish").map((call) => call[2])).toEqual([
    "./packages/core/dist",
    "./packages/styles/dist",
    "./packages/react/dist",
  ]);
});

test("dry-run prints the order without a registry lookup or publish", () => {
  const calls: string[][] = [];
  const result = publishRelease({
    dryRun: true,
    manifests: packageIds.map(manifest),
    runner: (command, args) => {
      calls.push([command, ...args]);
      return { exitCode: 0, stderr: "", stdout: "" };
    },
  });

  expect(calls).toEqual([]);
  expect(result.dryRun).toEqual(packageNames.map((packageName) => `${packageName}@0.2.0`));
});
