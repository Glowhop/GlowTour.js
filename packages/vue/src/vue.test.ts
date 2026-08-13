import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createTourStore,
  GlowTourBackTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  glowTour,
} from "./index";

describe("vue adapter contract", () => {
  test("exports the shared core API and an isolated Vue singleton", () => {
    assert.equal(typeof createTourStore, "function");
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof glowTour.state.get, "function");
  });

  test("exports every named Vue component", () => {
    assert.equal(GlowTourRoot.name, "GlowTourRoot");
    assert.equal(GlowTourHeader.name, "GlowTourHeader");
    assert.equal(GlowTourContent.name, "GlowTourContent");
    assert.equal(GlowTourFooter.name, "GlowTourFooter");
    assert.equal(GlowTourPopover.name, "GlowTourPopover");
    assert.equal(GlowTourOverlay.name, "GlowTourOverlay");
    assert.equal(GlowTourPointer.name, "GlowTourPointer");
    assert.equal(GlowTourBackTrigger.name, "GlowTourBackTrigger");
    assert.equal(GlowTourNextTrigger.name, "GlowTourNextTrigger");
  });

  test("exposes label overrides without legacy previous props", () => {
    assert.equal("backLabel" in (GlowTourBackTrigger.props ?? {}), true);
    assert.equal("previousLabel" in (GlowTourBackTrigger.props ?? {}), false);
    assert.equal("nextLabel" in (GlowTourNextTrigger.props ?? {}), true);
    assert.equal("finishLabel" in (GlowTourNextTrigger.props ?? {}), true);
  });

  test("owns the pointer content wrapper", () => {
    const source = readFileSync(
      new URL("./components/tour-components.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /"data-glow-tour-pointer-content":\s*""/);
  });
});
