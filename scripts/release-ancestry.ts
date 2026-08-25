import { resolve } from "node:path";

function git(cwd: string, args: readonly string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stderr: "pipe", stdout: "pipe" });
  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString(),
  };
}

export function assertCommitOnMain(cwd: string, commit: string) {
  const fetch = git(cwd, ["fetch", "origin", "main"]);
  if (fetch.exitCode !== 0) throw new Error(`git fetch origin main failed:\n${fetch.stderr}`);

  const ancestry = git(cwd, ["merge-base", "--is-ancestor", commit, "origin/main"]);
  if (ancestry.exitCode !== 0) {
    throw new Error(`${commit} is not reachable from origin/main`);
  }
}

function main() {
  const [commit, ...extra] = Bun.argv.slice(2);
  if (!commit || extra.length > 0) throw new Error("usage: bun scripts/release-ancestry.ts <commit>");
  assertCommitOnMain(resolve(import.meta.dir, ".."), commit);
  console.log(`${commit} is reachable from origin/main.`);
}

if (import.meta.main) main();
