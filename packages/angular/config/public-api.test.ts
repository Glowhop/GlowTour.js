import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createGlowTour } from "../src/lib/glow-tour";
import { createWorkflowFromConfig } from "./public-api";

describe("angular config entry point", () => {
  test("createWorkflowFromConfig needs no generic or cast to run through createGlowTour", async () => {
    // Compile-level regression test: `createWorkflowFromConfig(json)` must be directly assignable
    // to what `createGlowTour().start(...)` expects, with no `<string | TemplateRef<unknown>>` type
    // argument and no cast. See docs/json-config-design.md.
    const definition = createWorkflowFromConfig({
      name: "onboarding",
      version: "1.1",
      steps: [{ id: "s1", target: "#invite-button", title: "Invite", content: "Invite your team" }],
    });

    await assert.rejects(() => createGlowTour().start(definition), /connected root/i);
  });
});
