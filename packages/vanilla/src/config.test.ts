import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createWorkflowFromConfig } from "./config";
import { createGlowTour } from "./glow-tour";

describe("vanilla config entry point", () => {
  test("createWorkflowFromConfig needs no generic or cast to run through createGlowTour", async () => {
    // Compile-level regression test: `createWorkflowFromConfig(json)` must be directly assignable
    // to what `createGlowTour().run(...)` expects, with no `<string | Node>` type argument and no
    // cast. See HANDOFF-serializable-config.md.
    const definition = createWorkflowFromConfig({
      name: "onboarding",
      steps: [{ target: "#invite-button", title: "Invite", content: "Invite your team" }],
    });

    await assert.rejects(() => createGlowTour().run(definition), /connected root/i);
  });
});
