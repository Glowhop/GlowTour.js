import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import type { SolidTourContent } from "./glow-tour";

describe("solid adapter browser behavior", () => {
  test("updates mounted controls and cleans up subscriptions and element refs", async () => {
    const window = new Window();
    Object.assign(globalThis, {
      document: window.document,
      Event: window.Event,
      HTMLElement: window.HTMLElement,
      MouseEvent: window.MouseEvent,
      Node: window.Node,
      SVGSVGElement: window.SVGSVGElement,
      window,
    });

    const [{ render }, { GlowTour, WorkflowStep, glowTour }] = await Promise.all([
      import("solid-js/web"),
      import("./index"),
    ]);
    const container = document.createElement("div");
    document.body.append(container);

    const step = new WorkflowStep<SolidTourContent>({
      target: "#target",
      props: { content: "Initial content", title: "Initial title" },
    });
    const originalSnapshot = glowTour.state.get();
    const originalNext = glowTour.state.next;
    const originalRegisterPopover = glowTour.state.registerElementPopover;
    const originalStateSubscribe = glowTour.state.subscribe;
    const originalStepSubscribe = step.props.subscribe;
    let activeStateSubscriptions = 0;
    let activeStepSubscriptions = 0;
    let nextCalls = 0;
    const registeredPopovers: Array<HTMLElement | null> = [];

    glowTour.state.next = async () => {
      nextCalls += 1;
    };
    glowTour.state.registerElementPopover = (element) => {
      registeredPopovers.push(element);
    };
    glowTour.state.subscribe = (listener) => {
      activeStateSubscriptions += 1;
      const unsubscribe = originalStateSubscribe.call(glowTour.state, listener);
      return () => {
        activeStateSubscriptions -= 1;
        unsubscribe();
      };
    };
    step.props.subscribe = (listener) => {
      activeStepSubscriptions += 1;
      const unsubscribe = originalStepSubscribe.call(step.props, listener);
      return () => {
        activeStepSubscriptions -= 1;
        unsubscribe();
      };
    };
    glowTour.state.snapshot.set({
      ...originalSnapshot,
      canGoNext: true,
      currentStep: step.getPublicProps(),
      currentStepIndex: 0,
      isFirstStep: true,
      isLastStep: false,
      name: "solid-browser-test",
      status: "idle",
      totalSteps: 1,
    });

    try {
      const dispose = render(
        () => [
          GlowTour.Popover({ children: "Popover" }),
          GlowTour.Header({}),
          GlowTour.Content({}),
          GlowTour.Footer({ children: "Footer" }),
          GlowTour.NextTrigger({}),
        ],
        container,
      );

      const mountedPopover = registeredPopovers.at(-1);
      assert.ok(mountedPopover);
      assert.equal(mountedPopover.tagName, "SECTION");
      assert.equal(container.querySelector("header")?.textContent, "Initial title");
      assert.equal(
        container.querySelector("[data-glow-tour-content]")?.textContent,
        "Initial content",
      );
      assert.equal(container.querySelector("footer")?.textContent, "Footer");

      const nextButton = container.querySelector<HTMLButtonElement>(
        "[data-glow-tour-next-trigger]",
      );
      assert.ok(nextButton);
      nextButton.click();
      assert.equal(nextCalls, 1);

      step.props.set((props) => ({
        ...props,
        content: "Updated content",
        disableNextButton: true,
        hideFooter: true,
        title: "Updated title",
      }));
      await Promise.resolve();

      assert.equal(container.querySelector("header")?.textContent, "Updated title");
      assert.equal(
        container.querySelector("[data-glow-tour-content]")?.textContent,
        "Updated content",
      );
      assert.equal(container.querySelector("footer"), null);
      assert.equal(nextButton.disabled, true);
      assert.ok(activeStateSubscriptions > 0);
      assert.ok(activeStepSubscriptions > 0);

      dispose();
      assert.equal(registeredPopovers.at(-1), null);
      assert.equal(activeStateSubscriptions, 0);
      assert.equal(activeStepSubscriptions, 0);
    } finally {
      glowTour.state.snapshot.set(originalSnapshot);
      glowTour.state.next = originalNext;
      glowTour.state.registerElementPopover = originalRegisterPopover;
      glowTour.state.subscribe = originalStateSubscribe;
      step.props.subscribe = originalStepSubscribe;
      window.close();
    }
  });
});
