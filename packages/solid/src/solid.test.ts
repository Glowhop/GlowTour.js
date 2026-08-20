import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { renderToString } from "solid-js/web";
import * as runtime from "./index";

describe("solid adapter contract", () => {
  test("exports an instance factory and component namespace without legacy runtime values", () => {
    assert.equal(typeof runtime.createGlowTour, "function");
    assert.equal(typeof runtime.GlowTour, "object");

    for (const legacy of [
      "Builder",
      "create",
      "createTourStore",
      "TourStore",
      "WorkflowInstance",
      "WorkflowStep",
      "glowTour",
    ]) {
      assert.equal(legacy in runtime, false, `${legacy} must not be public`);
    }
  });

  test("renders a root boundary without client-generated IDs during SSR", () => {
    const tour = runtime.createGlowTour();
    const html = renderToString(() =>
      runtime.GlowTour.Root({
        tour,
        get children() {
          return runtime.GlowTour.Popover({ children: "Content" });
        },
      }),
    );

    assert.match(html, /data-glow-tour-root/);
    assert.doesNotMatch(html, /id="glow-tour/);
    assert.doesNotMatch(html, /aria-labelledby/);
    assert.doesNotMatch(html, /aria-describedby/);
  });

  test("exposes every instance-scoped component including cancellation", () => {
    for (const component of [
      runtime.GlowTour.Root,
      runtime.GlowTour.Header,
      runtime.GlowTour.Content,
      runtime.GlowTour.Footer,
      runtime.GlowTour.Popover,
      runtime.GlowTour.Overlay,
      runtime.GlowTour.Pointer,
      runtime.GlowTour.BackTrigger,
      runtime.GlowTour.NextTrigger,
      runtime.GlowTour.CancelTrigger,
    ]) {
      assert.equal(typeof component, "function");
    }
  });
});
