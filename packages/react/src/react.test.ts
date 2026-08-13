import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createTourStore, GlowTour, glowTour } from "./index";

describe("react adapter contract", () => {
  test("exports the shared core API and the React tour singleton", () => {
    assert.equal(typeof createTourStore, "function");
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof glowTour.state.get, "function");
  });

  test("exports every public React component", () => {
    assert.equal(typeof GlowTour.Root, "function");
    assert.equal(typeof GlowTour.Header, "function");
    assert.equal(typeof GlowTour.Content, "function");
    assert.equal(typeof GlowTour.Footer, "function");
    assert.equal(typeof GlowTour.Popover, "function");
    assert.equal(typeof GlowTour.Overlay, "function");
    assert.equal(typeof GlowTour.Pointer, "function");
    assert.equal(typeof GlowTour.BackTrigger, "function");
    assert.equal(typeof GlowTour.NextTrigger, "function");
  });

  test("declares accessible overlay and pointer defaults", () => {
    const popover = GlowTour.Popover({});
    assert.equal("data-glow-tour-popover" in popover.props, true);
    assert.equal("data-glow-tour-root" in popover.props, false);

    const overlay = GlowTour.Overlay({});
    assert.equal(overlay.props["aria-hidden"], true);
    assert.equal(overlay.props.focusable, "false");
    assert.equal(overlay.props.role, "presentation");
    assert.equal("data-glow-tour-overlay" in overlay.props, true);

    const pointer = GlowTour.Pointer({ children: "☝️" });
    assert.equal(pointer.props["aria-hidden"], "true");
    assert.equal("data-glow-tour-pointer" in pointer.props, true);
    assert.equal(pointer.props.children.type, "div");
    assert.equal("data-glow-tour-pointer-content" in pointer.props.children.props, true);
    assert.equal(pointer.props.children.props.children, "☝️");
  });
});
