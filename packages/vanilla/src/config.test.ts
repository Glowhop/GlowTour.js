import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createWorkflowFromConfig } from "./config";
import { createGlowTour } from "./glow-tour";

describe("vanilla config entry point", () => {
  test("createWorkflowFromConfig needs no generic or cast to run through createGlowTour", async () => {
    // Compile-level regression test: `createWorkflowFromConfig(json)` must be directly assignable
    // to what `createGlowTour().run(...)` expects, with no `<string | Node>` type argument and no
    // cast. See docs/json-config-design.md.
    const definition = createWorkflowFromConfig({
      name: "onboarding",
      version: "1.1",
      steps: [{ id: "s1", target: "#invite-button", title: "Invite", content: "Invite your team" }],
    });

    await assert.rejects(() => createGlowTour().run(definition), /connected root/i);
  });
});
