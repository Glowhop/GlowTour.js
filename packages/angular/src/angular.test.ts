import "@angular/compiler";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createTourStore,
  GLOW_TOUR_COMPONENT_TEMPLATES,
  GlowTourBackTrigger,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPointer,
  GlowTourPopover,
  GlowTourRoot,
  GlowTourService,
  glowTour,
} from "./public-api";

describe("angular adapter contract", () => {
  test("exports the core API, singleton and Angular service", () => {
    assert.equal(typeof createTourStore, "function");
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    const service = new GlowTourService();
    assert.equal(service.state, glowTour.state);
  });

  test("exports every standalone Angular component", () => {
    assert.equal(typeof GlowTourRoot, "function");
    assert.equal(typeof GlowTourHeader, "function");
    assert.equal(typeof GlowTourContent, "function");
    assert.equal(typeof GlowTourFooter, "function");
    assert.equal(typeof GlowTourPopover, "function");
    assert.equal(typeof GlowTourOverlay, "function");
    assert.equal(typeof GlowTourPointer, "function");
    assert.equal(typeof GlowTourBackTrigger, "function");
    assert.equal(typeof GlowTourNextTrigger, "function");
  });

  test("uses accessible native templates and kebab-case selectors", () => {
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /role="dialog"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /<svg/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.pointer, /aria-hidden="true"/);
    assert.match(
      GLOW_TOUR_COMPONENT_TEMPLATES.pointer,
      /<div data-glow-tour-pointer-content><ng-content \/><\/div>/,
    );
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.backTrigger, /data-glow-tour-back-trigger/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /data-glow-tour-next-trigger/);
  });
});
