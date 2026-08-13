import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertCommitOnMain } from "./release-ancestry";

function run(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stderr: "pipe", stdout: "pipe" });
  if (result.exitCode !== 0) throw new Error(`${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.toString().trim();
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "glow-tour-ancestry-"));
  const remote = join(root, "remote.git");
  const author = ["-c", "user.email=test@example.com", "-c", "user.name=Test"];
  run(root, "init", "--bare", remote);
  run(root, "clone", remote, "source");
  const source = join(root, "source");
  run(source, "checkout", "-b", "main");
  run(source, ...author, "commit", "--allow-empty", "-m", "base");
  const base = run(source, "rev-parse", "HEAD");
  run(source, ...author, "commit", "--allow-empty", "-m", "tip");
  run(source, "push", "origin", "main");
  run(source, "checkout", "-b", "outside", base);
  run(source, ...author, "commit", "--allow-empty", "-m", "outside");
  const outside = run(source, "rev-parse", "HEAD");
  run(source, "push", "origin", "outside");
  run(root, "clone", "--branch", "main", `file://${remote}`, "checkout");
  return { base, checkout: join(root, "checkout"), outside };
}

test("accepts a non-tip ancestor after fetching main history and rejects a commit outside main", () => {
  const { base, checkout, outside } = fixture();

  expect(() => assertCommitOnMain(checkout, base)).not.toThrow();
  expect(() => assertCommitOnMain(checkout, outside)).toThrow("is not reachable from origin/main");
});
