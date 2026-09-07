import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createGlowTour } from "../src/lib/glow-tour";
import { createWorkflowFromConfig } from "./public-api";

describe("angular config entry point", () => {
  test("createWorkflowFromConfig needs no generic or cast to run through createGlowTour", async () => {
    // Compile-level regression test: `createWorkflowFromConfig(json)` must be directly assignable
    // to what `createGlowTour().run(...)` expects, with no `<string | TemplateRef<unknown>>` type
    // argument and no cast. See HANDOFF-serializable-config.md.
    const definition = createWorkflowFromConfig({
      name: "onboarding",
      steps: [{ target: "#invite-button", title: "Invite", content: "Invite your team" }],
    });

    await assert.rejects(() => createGlowTour().run(definition), /connected root/i);
  });
});
