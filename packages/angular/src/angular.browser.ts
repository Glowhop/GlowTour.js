import "@angular/compiler";
import "zone.js";
import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { Window } from "happy-dom";
import * as runtime from "./public-api";

let window: Window;

beforeAll(() => {
  window = new Window();
  Object.assign(globalThis, {
    Event: window.Event,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    Node: window.Node,
    ResizeObserver: window.ResizeObserver,
    SVGSVGElement: window.SVGSVGElement,
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    document: window.document,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    window,
  });
});

beforeEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  window.close();
});

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

describe("angular adapter browser behavior", () => {
  test("connects a root during Angular initialization and releases it on destruction", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    document.body.append(target);

    @Component({
      selector: "angular-root-lifecycle",
      standalone: true,
      imports: [
        runtime.GlowTourRoot,
        runtime.GlowTourPopover,
        runtime.GlowTourHeader,
        runtime.GlowTourContent,
        runtime.GlowTourFooter,
        runtime.GlowTourBackTrigger,
        runtime.GlowTourNextTrigger,
        runtime.GlowTourCancelTrigger,
        runtime.GlowTourOverlay,
        runtime.GlowTourPointer,
      ],
      template: `
        <glow-tour-root [tour]="tour" idPrefix="angular">
          <glow-tour-overlay />
          <glow-tour-pointer />
          <glow-tour-popover>
            <glow-tour-header />
            <glow-tour-content />
            <glow-tour-footer>
              <glow-tour-back-trigger />
              <glow-tour-next-trigger />
              <glow-tour-cancel-trigger />
            </glow-tour-footer>
          </glow-tour-popover>
        </glow-tour-root>
      `,
    })
    class LifecycleHarness {
      readonly tour = tour;
    }

    document.body.append(document.createElement("angular-root-lifecycle"));
    const app = await bootstrapApplication(LifecycleHarness);
    await settle();
    app.tick();

    const root = document.querySelector<HTMLElement>("[data-glow-tour-root]");
    const popover = document.querySelector<HTMLElement>("[data-glow-tour-popover]");
    assert.equal(root?.id, "angular-root");
    assert.equal(popover?.id, "angular-popover");
    assert.equal(popover?.getAttribute("aria-labelledby"), "angular-title");
    assert.equal(popover?.getAttribute("aria-describedby"), "angular-description");

    const workflow = tour
      .create("angular lifecycle")
      .step({ content: "First content", target, title: "First title" })
      .step({ content: "Second content", target, title: "Second title" })
      .finish();
    await tour.run(workflow);
    await settle();
    app.tick();
    assert.match(document.body.textContent ?? "", /First title/);
    assert.match(document.body.textContent ?? "", /First content/);

    const next = document.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    assert.equal(next?.getAttribute("aria-controls"), "angular-popover");
    assert.equal(next?.disabled, false);
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);

    await app.destroy();
    await assert.rejects(() => tour.run(tour.create("released").finish()), /connected root/i);
  });

  test("reconnects only the latest Angular input pair and isolates nearest nested roots", async () => {
    const first = runtime.createGlowTour();
    const second = runtime.createGlowTour();
    const inner = runtime.createGlowTour();
    const outerTarget = document.createElement("button");
    const innerTarget = document.createElement("button");
    document.body.append(outerTarget, innerTarget);

    @Component({
      selector: "angular-root-replacement",
      standalone: true,
      imports: [runtime.GlowTourRoot, runtime.GlowTourNextTrigger],
      template: `
        <glow-tour-root [tour]="tour" [idPrefix]="idPrefix">
          <glow-tour-next-trigger />
          <glow-tour-root [tour]="inner" idPrefix="inner">
            <glow-tour-next-trigger />
          </glow-tour-root>
        </glow-tour-root>
      `,
    })
    class ReplacementHarness {
      tour = first;
      idPrefix = "first";
      readonly inner = inner;
    }

    document.body.append(document.createElement("angular-root-replacement"));
    const app = await bootstrapApplication(ReplacementHarness);
    await settle();
    app.tick();
    assert.equal(document.querySelector("[data-glow-tour-root]")?.id, "first-root");

    const harness = app.components[0]?.instance;
    assert.ok(harness instanceof ReplacementHarness);
    harness.tour = second;
    harness.idPrefix = "second";
    app.tick();
    await settle();
    assert.equal(document.querySelector("[data-glow-tour-root]")?.id, "second-root");
    await assert.rejects(
      () => first.run(first.create("first released").finish()),
      /connected root/i,
    );

    const workflow = (tour: typeof second, target: HTMLElement, name: string) =>
      tour
        .create(name)
        .step({ content: "One", target, title: "One" })
        .step({ content: "Two", target, title: "Two" })
        .finish();
    await second.run(workflow(second, outerTarget, "outer"));
    await inner.run(workflow(inner, innerTarget, "inner"));
    const [outerNext, innerNext] = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-glow-tour-next-trigger]"),
    );
    assert.equal(innerNext?.disabled, false);
    innerNext?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(inner.state.get().currentStepIndex, 1);
    assert.equal(second.state.get().currentStepIndex, 0);
    assert.notEqual(
      outerNext?.getAttribute("aria-controls"),
      innerNext?.getAttribute("aria-controls"),
    );
    await app.destroy();
  });

  test("reports a scoped-context error for a standalone descendant", async () => {
    @Component({
      selector: "angular-outside-root",
      standalone: true,
      imports: [runtime.GlowTourNextTrigger],
      template: "<glow-tour-next-trigger />",
    })
    class OutsideRootHarness {}

    document.body.append(document.createElement("angular-outside-root"));
    const reportError = console.error;
    console.error = () => {};
    try {
      await assert.rejects(
        () => bootstrapApplication(OutsideRootHarness),
        /inside <glow-tour-root/i,
      );
    } finally {
      console.error = reportError;
    }
  });
});
