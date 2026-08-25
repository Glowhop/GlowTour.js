import "@angular/compiler";
import "zone.js";
import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Component, ErrorHandler, type OnInit } from "@angular/core";
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
    const firstBack = document.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    assert.equal(firstBack?.disabled, true);
    assert.equal(firstBack?.getAttribute("aria-disabled"), "true");

    tour.updateCurrentStep((props) => ({
      ...props,
      content: "Updated content",
      hideFooter: true,
      hideNextButton: true,
      title: "Updated title",
    }));
    await settle();
    app.tick();
    assert.match(document.body.textContent ?? "", /Updated title/);
    assert.match(document.body.textContent ?? "", /Updated content/);
    assert.equal(document.querySelector("[data-glow-tour-footer]"), null);
    assert.equal(document.querySelector("[data-glow-tour-next-trigger]"), null);

    tour.updateCurrentStep((props) => ({ ...props, hideFooter: false, hideNextButton: false }));
    await settle();
    app.tick();

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

  test("keeps sibling root controls, IDs, and delegated commands isolated", async () => {
    const first = runtime.createGlowTour();
    const second = runtime.createGlowTour();
    const firstTarget = document.createElement("button");
    const secondTarget = document.createElement("button");
    document.body.append(firstTarget, secondTarget);

    @Component({
      selector: "angular-sibling-roots",
      standalone: true,
      imports: [runtime.GlowTourRoot, runtime.GlowTourPopover, runtime.GlowTourNextTrigger],
      template: `
        <glow-tour-root [tour]="first" idPrefix="first-sibling">
          <glow-tour-popover />
          <glow-tour-next-trigger />
        </glow-tour-root>
        <glow-tour-root [tour]="second" idPrefix="second-sibling">
          <glow-tour-popover />
          <glow-tour-next-trigger />
        </glow-tour-root>
      `,
    })
    class SiblingRootsHarness {
      readonly first = first;
      readonly second = second;
    }

    document.body.append(document.createElement("angular-sibling-roots"));
    const app = await bootstrapApplication(SiblingRootsHarness);
    const workflow = (tour: typeof first, target: HTMLElement, name: string) =>
      tour
        .create(name)
        .step({ content: `${name} one`, target, title: `${name} one` })
        .step({ content: `${name} two`, target, title: `${name} two` })
        .finish();
    await first.run(workflow(first, firstTarget, "first"));
    await second.run(workflow(second, secondTarget, "second"));
    await settle();
    app.tick();

    const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-glow-tour-root]"));
    const popovers = Array.from(document.querySelectorAll<HTMLElement>("[data-glow-tour-popover]"));
    const [firstNext, secondNext] = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-glow-tour-next-trigger]"),
    );
    assert.deepEqual(
      roots.map((root) => root.id),
      ["first-sibling-root", "second-sibling-root"],
    );
    assert.deepEqual(
      popovers.map((popover) => popover.id),
      ["first-sibling-popover", "second-sibling-popover"],
    );
    assert.equal(firstNext?.getAttribute("aria-controls"), "first-sibling-popover");
    assert.equal(secondNext?.getAttribute("aria-controls"), "second-sibling-popover");

    const secondControl = secondNext;
    const secondRootId = roots[1]?.id;
    const secondPopoverId = popovers[1]?.id;
    firstNext?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();

    assert.equal(first.state.get().currentStepIndex, 1);
    assert.equal(second.state.get().currentStepIndex, 0);
    assert.equal(secondNext, secondControl);
    assert.equal(secondNext?.isConnected, true);
    assert.equal(roots[1]?.id, secondRootId);
    assert.equal(popovers[1]?.id, secondPopoverId);
    assert.equal(secondNext?.getAttribute("aria-controls"), "second-sibling-popover");
    await app.destroy();
  });

  test("connects before a descendant Angular initialization can run its tour", async () => {
    const tour = runtime.createGlowTour();
    let started: Promise<void> | undefined;

    @Component({ selector: "angular-descendant-runner", standalone: true, template: "" })
    class DescendantRunner implements OnInit {
      ngOnInit() {
        started = tour.run(tour.create("descendant initialization").finish());
      }
    }

    @Component({
      selector: "angular-descendant-root",
      standalone: true,
      imports: [runtime.GlowTourRoot, DescendantRunner],
      template: '<glow-tour-root [tour]="tour"><angular-descendant-runner /></glow-tour-root>',
    })
    class DescendantRootHarness {
      readonly tour = tour;
    }

    document.body.append(document.createElement("angular-descendant-root"));
    const app = await bootstrapApplication(DescendantRootHarness);
    assert.ok(started);
    await assert.doesNotReject(started);
    await app.destroy();
  });

  test("batches tour and idPrefix replacement into one Angular root lease", async () => {
    const bridgeSymbol = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
    const calls: string[] = [];
    const fakeTour = (name: string) => {
      const tour = {};
      Object.defineProperty(tour, bridgeSymbol, {
        value: {
          connectRoot: ({ idPrefix }: { idPrefix?: string }) => {
            const prefix = idPrefix ?? "glow-tour";
            calls.push(`connect:${name}:${prefix}`);
            return {
              bindOverlay: () => () => {},
              bindPointer: () => () => {},
              bindPopover: () => () => {},
              ids: {
                description: `${prefix}-description`,
                popover: `${prefix}-popover`,
                root: `${prefix}-root`,
                title: `${prefix}-title`,
              },
              release: () => calls.push(`release:${name}:${prefix}`),
            };
          },
          version: 1,
        },
      });
      return tour as ReturnType<typeof runtime.createGlowTour>;
    };
    const first = fakeTour("first");
    const second = fakeTour("second");

    @Component({
      selector: "angular-batched-root",
      standalone: true,
      imports: [runtime.GlowTourRoot],
      template: '<glow-tour-root [tour]="tour" [idPrefix]="idPrefix" />',
    })
    class BatchedRootHarness {
      idPrefix = "first-prefix";
      tour = first;
    }

    document.body.append(document.createElement("angular-batched-root"));
    const app = await bootstrapApplication(BatchedRootHarness);
    assert.deepEqual(calls, ["connect:first:first-prefix"]);
    calls.length = 0;
    const harness = app.components[0]?.instance;
    assert.ok(harness instanceof BatchedRootHarness);
    harness.tour = second;
    harness.idPrefix = "second-prefix";
    app.tick();
    await settle();
    assert.deepEqual(calls, ["release:first:first-prefix", "connect:second:second-prefix"]);
    await app.destroy();
  });

  test("binds controls inserted after a tour starts and applies its custom shortcut", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    document.body.append(target);

    @Component({
      selector: "angular-late-trigger",
      standalone: true,
      imports: [runtime.GlowTourRoot, runtime.GlowTourNextTrigger],
      template: `
        <glow-tour-root [tour]="tour">
          @if (showNext) { <glow-tour-next-trigger /> }
        </glow-tour-root>
      `,
    })
    class LateTriggerHarness {
      readonly tour = tour;
      showNext = false;
    }

    document.body.append(document.createElement("angular-late-trigger"));
    const app = await bootstrapApplication(LateTriggerHarness);
    const workflow = tour
      .create("late trigger")
      .step({
        content: "One",
        popover: { keyboardShortcuts: { next: ["N"] } },
        target,
        title: "One",
      })
      .step({ content: "Two", target, title: "Two" })
      .finish();
    await tour.run(workflow);
    const harness = app.components[0]?.instance;
    assert.ok(harness instanceof LateTriggerHarness);
    harness.showNext = true;
    app.tick();
    await settle();
    const next = document.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    assert.equal(next?.getAttribute("aria-keyshortcuts"), "N");
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "N" }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    await app.destroy();
  });

  test("cleans a removed popover binding before registering its replacement", async () => {
    const bridgeSymbol = Symbol.for("@glowhop/core-tour/adapter-bridge/v1");
    const calls: string[] = [];
    const tour = {};
    Object.defineProperty(tour, bridgeSymbol, {
      value: {
        connectRoot: () => ({
          bindOverlay: () => () => {},
          bindPointer: () => () => {},
          bindPopover: () => {
            const id = calls.filter((entry) => entry.startsWith("bind")).length + 1;
            calls.push(`bind:${id}`);
            return () => calls.push(`release:${id}`);
          },
          ids: {
            description: "cleanup-description",
            popover: "cleanup-popover",
            root: "cleanup-root",
            title: "cleanup-title",
          },
          release: () => {},
        }),
        version: 1,
      },
    });

    @Component({
      selector: "angular-element-cleanup",
      standalone: true,
      imports: [runtime.GlowTourRoot, runtime.GlowTourPopover],
      template: `
        <glow-tour-root [tour]="tour">
          @if (showPopover) { <glow-tour-popover /> }
        </glow-tour-root>
      `,
    })
    class ElementCleanupHarness {
      readonly tour = tour as ReturnType<typeof runtime.createGlowTour>;
      showPopover = true;
    }

    document.body.append(document.createElement("angular-element-cleanup"));
    const app = await bootstrapApplication(ElementCleanupHarness);
    await settle();
    assert.deepEqual(calls, ["bind:1"]);
    const harness = app.components[0]?.instance;
    assert.ok(harness instanceof ElementCleanupHarness);
    harness.showPopover = false;
    app.tick();
    await settle();
    assert.deepEqual(calls, ["bind:1", "release:1"]);
    harness.showPopover = true;
    app.tick();
    await settle();
    assert.deepEqual(calls, ["bind:1", "release:1", "bind:2"]);
    await app.destroy();
  });

  test("reacts to dynamic trigger labels and consumer disabled bindings", async () => {
    const tour = runtime.createGlowTour();
    const target = document.createElement("button");
    document.body.append(target);

    @Component({
      selector: "angular-trigger-inputs",
      standalone: true,
      imports: [
        runtime.GlowTourRoot,
        runtime.GlowTourBackTrigger,
        runtime.GlowTourNextTrigger,
        runtime.GlowTourCancelTrigger,
      ],
      template: `
        <glow-tour-root [tour]="tour">
          <glow-tour-back-trigger [backLabel]="backLabel" [disabled]="disabled" />
          <glow-tour-next-trigger [finishLabel]="finishLabel" [nextLabel]="nextLabel" [disabled]="disabled" (click)="onNextClick($event)" />
          <glow-tour-cancel-trigger [ariaLabel]="cancelAria" [disabled]="disabled" />
          <glow-tour-cancel-trigger ariaLabel="Static cancel" data-static-cancel disabled />
        </glow-tour-root>
      `,
    })
    class TriggerInputsHarness {
      readonly tour = tour;
      backLabel = "Back one";
      cancelAria = "Cancel one";
      disabled = true;
      finishLabel = "Finish one";
      nextLabel = "Next one";
      preventNext = false;

      onNextClick(event: Event) {
        if (this.preventNext) event.preventDefault();
      }
    }

    document.body.append(document.createElement("angular-trigger-inputs"));
    const app = await bootstrapApplication(TriggerInputsHarness);
    const workflow = tour
      .create("dynamic trigger inputs")
      .step({ content: "One", target, title: "One" })
      .step({ content: "Two", target, title: "Two" })
      .finish();
    await tour.run(workflow);
    await settle();
    app.tick();

    const next = document.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    const cancel = document.querySelector<HTMLButtonElement>("[data-glow-tour-cancel-trigger]");
    const staticCancel = document.querySelector<HTMLButtonElement>(
      "[data-static-cancel] [data-glow-tour-cancel-trigger]",
    );
    assert.equal(next?.textContent, "Next one");
    assert.equal(next?.disabled, true);
    assert.equal(next?.getAttribute("aria-disabled"), "true");
    assert.equal(next?.getAttribute("data-glow-tour-consumer-disabled"), "true");
    assert.equal(cancel?.textContent, "Cancel tour");
    assert.equal(cancel?.getAttribute("aria-label"), "Cancel one");
    assert.equal(staticCancel?.disabled, true);
    assert.equal(staticCancel?.getAttribute("aria-disabled"), "true");
    assert.equal(staticCancel?.getAttribute("data-glow-tour-consumer-disabled"), "true");

    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().status, "active");

    const harness = app.components[0]?.instance;
    assert.ok(harness instanceof TriggerInputsHarness);
    harness.backLabel = "Back two";
    harness.cancelAria = "Cancel two";
    harness.disabled = false;
    harness.nextLabel = "Next two";
    app.tick();
    await settle();

    assert.equal(next?.textContent, "Next two");
    assert.equal(next?.disabled, false);
    assert.equal(next?.getAttribute("aria-disabled"), "false");
    assert.equal(next?.hasAttribute("data-glow-tour-consumer-disabled"), false);
    assert.equal(cancel?.getAttribute("aria-label"), "Cancel two");

    harness.preventNext = true;
    app.tick();
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);

    harness.preventNext = false;
    app.tick();
    next?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);

    app.tick();
    const back = document.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    assert.equal(back?.textContent, "Back two");
    assert.equal(back?.disabled, false);
    assert.equal(next?.textContent, "Finish one");
    harness.finishLabel = "Finish two";
    harness.disabled = true;
    app.tick();
    await settle();
    assert.equal(next?.textContent, "Finish two");
    assert.equal(back?.disabled, true);
    assert.equal(cancel?.disabled, true);

    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");

    harness.disabled = false;
    app.tick();
    await settle();
    back?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().currentStepIndex, 0);

    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    assert.equal(tour.state.get().status, "cancelled");
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

  test("reports Angular's required tour input error for an unbound root", async () => {
    @Component({
      selector: "angular-missing-tour",
      standalone: true,
      imports: [runtime.GlowTourRoot],
      template: "<glow-tour-root />",
    })
    class MissingTourHarness {}

    const errors: unknown[] = [];
    document.body.append(document.createElement("angular-missing-tour"));
    const app = await bootstrapApplication(MissingTourHarness, {
      providers: [
        {
          provide: ErrorHandler,
          useValue: { handleError: (error: unknown) => errors.push(error) },
        },
      ],
    });
    await settle();

    assert.equal(errors.length, 1);
    assert.match(String(errors[0]), /requires a tour input/i);
    await app.destroy();
  });
});
