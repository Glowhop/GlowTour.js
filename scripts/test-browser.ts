import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const browserSuites = [
  "./packages/react/src/react.browser.ts",
  "./packages/solid/src/solid.browser.ts",
  "./packages/vue/src/vue.browser.ts",
  "./packages/angular/src/angular.browser.ts",
] as const;

for (const suite of browserSuites) {
  const result = Bun.spawnSync(["bun", "test", "--conditions=browser", suite], {
    cwd: root,
    stderr: "inherit",
    stdout: "inherit",
  });
  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
    break;
  }
}
