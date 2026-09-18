import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  NoopTourViewDriver,
  type TourViewCommands,
  type TourViewDriver,
} from "../dom/tour-view-driver";
import type { StepContext, StepHookContext, TourCurrentStep, TourEvent } from "../types";
import type { ActiveStep } from "./active-step";
import {
  createGlowTour as createPublicGlowTour,
  TARGET_LOSS_GRACE_MS,
  TourController,
} from "./tour-controller";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function trackAbortListeners(
  signal: AbortSignal,
  counts: { added: number; removed: number },
  onAdded?: () => void,
) {
  const add = signal.addEventListener.bind(signal) as (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  const remove = signal.removeEventListener.bind(signal) as (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) => void;
  signal.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (type === "abort") {
      counts.added += 1;
      onAdded?.();
    }
    add(type, listener, options);
  }) as AbortSignal["addEventListener"];
  signal.removeEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) => {
    if (type === "abort") counts.removed += 1;
    remove(type, listener, options);
  }) as AbortSignal["removeEventListener"];
}

const target = {} as HTMLElement;
const targetResolver = () => target;

function createRealmDocument() {
  let selected: HTMLElement | null = null;

  class RealmElement {
    isConnected = true;

    constructor(readonly ownerDocument: Document) {}
  }

  const document = {
    defaultView: { HTMLElement: RealmElement },
    querySelector: () => selected,
  } as unknown as Document;

  return {
    document,
    element: () => new RealmElement(document) as unknown as HTMLElement,
    select(element: HTMLElement | null) {
      selected = element;
    },
  };
}

function createGlowTour<T>() {
  return new TourController<T>(new NoopTourViewDriver());
}

class RecordingDriver implements TourViewDriver<string> {
  clearCalls = 0;
  clearError: Error | null = null;
  commands: TourViewCommands | null = null;
  disposeCalls = 0;
  showCalls = 0;
  showError: Error | null = null;
  retargetCalls = 0;
  retargetError: Error | null = null;
  retargetedTargets: (HTMLElement | null)[] = [];

  clear() {
    this.clearCalls += 1;
    if (this.clearError) throw this.clearError;
  }

  dispose() {
    this.disposeCalls += 1;
  }

  show(_step: ActiveStep<string>) {
    this.showCalls += 1;
    if (this.showError) throw this.showError;
  }

  retarget(step: ActiveStep<string>) {
    this.retargetCalls += 1;
    this.retargetedTargets.push(step.target);
    if (this.retargetError) throw this.retargetError;
  }

  setCommands(commands: TourViewCommands) {
    this.commands = commands;
  }
}

class StagedTransitionDriver implements TourViewDriver<string> {
  private beforeAppear: (() => void | Promise<void>) | undefined;
  private pendingShow: ReturnType<typeof deferred<void>> | null = null;
  private pause = false;

  clear() {}

  retarget() {}

  dispose() {}

  pauseAdvanceShow() {
    this.pause = true;
    this.pendingShow = deferred<void>();
  }

  async commitContent() {
    assert.ok(this.beforeAppear, "Expected the controller to provide a content commit callback");
    await this.beforeAppear?.();
  }

  finishShow() {
    assert.ok(this.pendingShow, "Expected a pending show");
    this.pendingShow?.resolve();
  }

  async show(
    _step: ActiveStep<string>,
    _direction?: unknown,
    _signal?: AbortSignal,
    onBeforePopoverAppear?: () => void | Promise<void>,
  ) {
    if (!this.pause) {
      await onBeforePopoverAppear?.();
      return;
    }
    this.pause = false;
    this.beforeAppear = onBeforePopoverAppear;
    await this.pendingShow?.promise;
  }
}

async function flushMicrotasks() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

async function delay(durationMs: number) {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

describe("instance-first TourController", () => {
  test("uses the document returned by assertCanRun for selector targets", async () => {
    const realm = createRealmDocument();
    const element = realm.element();
    realm.select(element);
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      assertCanRun: () => realm.document,
    });
    const workflow = tour
      .create("root-document")
      .step({ id: "step-1", content: "one", target: "#root-only", title: "one" })
      .build();

    await tour.start(workflow);

    assert.equal(tour.state.get().currentStep?.target, element);
  });

  test("rejects invalid workflow options before mutating lifecycle state", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("invalid", { overlay: { opacity: 1.1 } })
      .step({ id: "step-2", content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(() => tour.start(workflow), {
      message: "Invalid option: options.overlay.opacity",
      name: "TypeError",
    });

    assert.deepEqual(tour.state.get(), {
      canAdvance: false,
      canCancel: false,
      canPrevious: false,
      currentStep: null,
      currentStepIndex: -1,
      direction: "advance",
      error: null,
      isFirstStep: false,
      isLastStep: false,
      name: "",
      status: "idle",
      totalSteps: 0,
    });
  });

  test("identifies invalid step behavior by its workflow index", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("invalid")
      .step({
        id: "step-3",
        behavior: { missingTarget: { timeout: Number.NaN } },
        content: "one",
        target: targetResolver,
        title: "one",
      })
      .build();

    await assert.rejects(() => tour.start(workflow), {
      message: "Invalid option: steps[0].behavior.missingTarget.timeout",
      name: "TypeError",
    });
  });

  test("passes the workflow to assertCanRun before lifecycle state changes", async () => {
    let onStartCalls = 0;
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      assertCanRun: (workflow) => {
        if (workflow.steps.length > 0) throw new Error("presentation unavailable");
      },
    });
    const workflow = tour
      .create("guarded", {
        onStart: () => {
          onStartCalls += 1;
        },
      })
      .step({ id: "step-4", content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(() => tour.start(workflow), /presentation unavailable/);

    assert.equal(onStartCalls, 0);
    assert.equal(tour.state.get().status, "idle");
    assert.equal(tour.state.get().error, null);
  });

  describe("lifecycle hook context and abort", () => {
    test("onStart receives the first step for a non-empty workflow and null for an empty workflow", async () => {
      let receivedStep: TourCurrentStep<string> | null | undefined;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onstart-step", {
          onStart: (context) => {
            receivedStep = context.step;
          },
        })
        .step({ id: "step-5", content: "content-one", target: targetResolver, title: "title-one" })
        .build();

      await tour.start(workflow);

      assert.ok(receivedStep);
      assert.equal(receivedStep?.initialProps.title, "title-one");
      assert.equal(receivedStep?.target, null);

      let receivedEmptyStep: TourCurrentStep<string> | null | undefined;
      const emptyTour = createGlowTour<string>();
      const emptyWorkflow = emptyTour
        .create("onstart-empty", {
          onStart: (context) => {
            receivedEmptyStep = context.step;
          },
        })
        .build();

      await emptyTour.start(emptyWorkflow);

      assert.equal(receivedEmptyStep, null);
    });

    test("aborting onStart prevents the tour from entering step 0", async () => {
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onstart-abort", {
          onStart: (context) => {
            context.abort();
          },
        })
        .step({ id: "step-6", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);

      assert.equal(tour.state.get().status, "idle");
      assert.equal(tour.state.get().currentStep, null);
    });

    test("aborting onStart for an empty workflow prevents onFinish from firing", async () => {
      let finishCalls = 0;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onstart-abort-empty", {
          onFinish: () => {
            finishCalls += 1;
          },
          onStart: (context) => {
            context.abort();
          },
        })
        .build();

      await tour.start(workflow);

      assert.equal(finishCalls, 0);
      assert.notEqual(tour.state.get().status, "finished");
    });

    test("aborting onFinish for a zero-step workflow resets the controller to idle instead of wedging it", async () => {
      let onFinishCalls = 0;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onfinish-abort-empty", {
          onFinish: (context) => {
            onFinishCalls += 1;
            context.abort();
          },
        })
        .build();

      await tour.start(workflow);

      assert.equal(onFinishCalls, 1);
      assert.equal(tour.state.get().status, "idle");
      assert.equal(tour.state.get().currentStep, null);

      let secondRunFinishes = 0;
      const secondWorkflow = tour
        .create("onfinish-abort-empty-followup", {
          onFinish: () => {
            secondRunFinishes += 1;
          },
        })
        .step({ id: "step-7", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(secondWorkflow);

      assert.equal(tour.state.get().status, "active");
      assert.equal(tour.state.get().name, "onfinish-abort-empty-followup");
      assert.equal(tour.state.get().currentStep?.currentProps.title, "title");

      await tour.advance();
      assert.equal(secondRunFinishes, 1);
      assert.equal(tour.state.get().status, "finished");
    });

    describe("an aborted start over an active tour", () => {
      async function runOverActiveTour(
        build: (tour: TourController<string>) => {
          build(): Parameters<TourController<string>["start"]>[0];
        },
      ) {
        const driver = new RecordingDriver();
        const tour = new TourController<string>(driver);
        await tour.start(
          tour
            .create("replaced")
            .step({ id: "replaced-step", content: "one", target: targetResolver, title: "one" })
            .build(),
        );
        assert.equal(tour.state.get().status, "active");
        assert.equal(driver.clearCalls, 0);
        await tour.start(build(tour).build());
        return { driver, tour };
      }

      test("clears the replaced tour when onStart aborts", async () => {
        const { driver, tour } = await runOverActiveTour((tour) =>
          tour
            .create("aborted", { onStart: (context) => context.abort() })
            .step({ id: "aborted-step", content: "two", target: targetResolver, title: "two" }),
        );

        assert.equal(driver.clearCalls, 1);
        assert.equal(tour.state.get().status, "idle");
        assert.equal(tour.state.get().currentStep, null);
      });

      test("clears the replaced tour when beforeEnter aborts the first step", async () => {
        const { driver, tour } = await runOverActiveTour((tour) =>
          tour
            .create("aborted")
            .step({ id: "aborted-step", content: "two", target: targetResolver, title: "two" })
            .beforeEnter(({ abort }) => abort()),
        );

        assert.equal(driver.clearCalls, 1);
        assert.equal(driver.showCalls, 1);
        assert.equal(tour.state.get().status, "idle");
        assert.equal(tour.state.get().currentStep, null);
      });

      test("clears the replaced tour when onFinish aborts an empty workflow", async () => {
        const { driver, tour } = await runOverActiveTour((tour) =>
          tour.create("aborted", { onFinish: (context) => context.abort() }),
        );

        assert.equal(driver.clearCalls, 1);
        assert.equal(tour.state.get().status, "idle");
        assert.equal(tour.state.get().currentStep, null);
      });

      test("does not clear when nothing was presented", async () => {
        const driver = new RecordingDriver();
        const tour = new TourController<string>(driver);
        await tour.start(
          tour
            .create("aborted", { onStart: (context) => context.abort() })
            .step({ id: "aborted-step", content: "two", target: targetResolver, title: "two" })
            .build(),
        );

        assert.equal(driver.clearCalls, 0);
        assert.equal(tour.state.get().status, "idle");
      });
    });

    test("aborting onStart asynchronously (before the returned promise resolves) also blocks the start", async () => {
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onstart-abort-async", {
          onStart: async (context) => {
            context.abort();
            await Promise.resolve();
          },
        })
        .step({ id: "step-8", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);

      assert.equal(tour.state.get().status, "idle");
      assert.equal(tour.state.get().currentStep, null);
    });

    test("non-aborting onStart preserves existing start behavior", async () => {
      let calls = 0;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onstart-noop", {
          onStart: () => {
            calls += 1;
          },
        })
        .step({ id: "step-9", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);

      assert.equal(calls, 1);
      assert.equal(tour.state.get().status, "active");
      assert.equal(tour.state.get().currentStep?.currentProps.title, "title");
    });

    test("onCancel receives the actual current step and aborting prevents cancellation", async () => {
      let receivedTitle: string | undefined;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("oncancel-abort", {
          onCancel: (context) => {
            receivedTitle = context.step?.currentProps.title;
            context.abort();
          },
        })
        .step({ id: "step-10", content: "content", target: targetResolver, title: "cancel-title" })
        .build();

      await tour.start(workflow);
      await tour.cancel();

      assert.equal(receivedTitle, "cancel-title");
      assert.equal(tour.state.get().status, "active");
      assert.equal(tour.state.get().currentStep?.currentProps.title, "cancel-title");
    });

    test("non-aborting onCancel preserves existing cancel behavior", async () => {
      let calls = 0;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("oncancel-noop", {
          onCancel: () => {
            calls += 1;
          },
        })
        .step({ id: "step-11", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);
      await tour.cancel();

      assert.equal(calls, 1);
      assert.equal(tour.state.get().status, "cancelled");
    });

    test("aborting onCancel asynchronously also blocks cancellation", async () => {
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("oncancel-abort-async", {
          onCancel: async (context) => {
            context.abort();
            await Promise.resolve();
          },
        })
        .step({ id: "step-12", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);
      await tour.cancel();

      assert.equal(tour.state.get().status, "active");
    });

    test("onFinish receives the last step and aborting prevents completion", async () => {
      let receivedTitle: string | undefined;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onfinish-abort", {
          onFinish: (context) => {
            receivedTitle = context.step?.currentProps.title;
            context.abort();
          },
        })
        .step({ id: "step-13", content: "content", target: targetResolver, title: "last-title" })
        .build();

      await tour.start(workflow);
      await tour.advance();

      assert.equal(receivedTitle, "last-title");
      assert.notEqual(tour.state.get().status, "finished");
      assert.equal(tour.state.get().currentStep?.currentProps.title, "last-title");
    });

    test("non-aborting onFinish preserves existing finish behavior", async () => {
      let calls = 0;
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onfinish-noop", {
          onFinish: () => {
            calls += 1;
          },
        })
        .step({ id: "step-14", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);
      await tour.advance();

      assert.equal(calls, 1);
      assert.equal(tour.state.get().status, "finished");
    });

    test("aborting onFinish asynchronously also blocks completion", async () => {
      const tour = createGlowTour<string>();
      const workflow = tour
        .create("onfinish-abort-async", {
          onFinish: async (context) => {
            context.abort();
            await Promise.resolve();
          },
        })
        .step({ id: "step-15", content: "content", target: targetResolver, title: "title" })
        .build();

      await tour.start(workflow);
      await tour.advance();

      assert.notEqual(tour.state.get().status, "finished");
    });
  });

  test("does not expose the removed updateCurrentStep command", () => {
    const tour = new TourController<string>(new NoopTourViewDriver());

    assert.equal("updateCurrentStep" in tour, false);
  });

  test("builds frozen plain definitions and isolates mutable step data per run", async () => {
    const tour = createGlowTour<string>();
    let activeProps!: StepContext<string>["props"];
    const workflow = tour
      .create("readonly", {
        popover: { arrow: { color: "#4c35fd" } },
        controls: { advance: { keys: ["Enter"] } },
      })
      .step({
        id: "step-16",
        content: "content",
        data: { count: 1 },
        overlay: { animation: { duration: 100, easing: "linear" } },
        target: targetResolver,
        title: "title",
      })
      .do(({ props }) => {
        activeProps = props;
      })
      .build();

    assert.equal(Object.getPrototypeOf(workflow), Object.prototype);
    assert.equal(Object.isFrozen(workflow), true);
    assert.equal(Object.isFrozen(workflow.steps), true);
    assert.equal(Object.isFrozen(workflow.steps[0]), true);
    assert.equal(Object.isFrozen(workflow.steps[0].props.data), true);
    assert.equal(Object.isFrozen(workflow.options.controls?.advance), true);
    assert.equal(Object.isFrozen(workflow.options.controls?.advance?.keys), true);
    assert.equal(Object.isFrozen(workflow.options.popover?.arrow), true);
    assert.equal(Object.isFrozen(workflow.steps[0].props.overlay?.animation), true);
    assert.equal("clone" in workflow.steps[0], false);

    await tour.start(workflow);
    assert.equal(Object.isFrozen(tour.state.get().currentStep), true);
    assert.equal(Object.isFrozen(tour.state.get().currentStep?.currentProps.data), true);
    activeProps.set((props) => ({ ...props, data: { count: 2 } }));
    assert.deepEqual(tour.state.get().currentStep?.currentProps.data, { count: 2 });
    assert.deepEqual(workflow.steps[0].props.data, { count: 1 });

    await tour.start(workflow);
    assert.deepEqual(tour.state.get().currentStep?.currentProps.data, { count: 1 });
  });

  test("freezes the state facade without changing subscription behavior", async () => {
    const tour = createGlowTour<string>();
    let notifications = 0;
    const originalGet = tour.state.get;
    const originalSubscribe = tour.state.subscribe;

    assert.equal(Object.isFrozen(tour.state), true);
    assert.equal(
      Reflect.set(tour.state, "get", () => null),
      false,
    );
    assert.equal(
      Reflect.set(tour.state, "subscribe", () => () => {}),
      false,
    );
    const unsubscribe = tour.state.subscribe(() => {
      notifications += 1;
    });
    await tour.start(
      tour
        .create("frozen-facade")
        .step({ id: "step-17", content: "one", target: targetResolver, title: "one" })
        .build(),
    );

    assert.equal(tour.state.get, originalGet);
    assert.equal(tour.state.subscribe, originalSubscribe);
    assert.equal(notifications, 5);
    unsubscribe();
  });

  test("runs, advances, and finishes with coherent state", async () => {
    const tour = createGlowTour<string>();
    const snapshots: string[] = [];
    const unsubscribe = tour.state.subscribe((state) => snapshots.push(state.status));
    const workflow = tour
      .create("lifecycle")
      .step({ id: "step-18", content: "one", target: targetResolver, title: "one" })
      .build();

    await tour.start(workflow);
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().canAdvance, true);
    assert.equal(tour.state.get().isLastStep, true);
    await tour.advance();
    assert.equal(tour.state.get().status, "finished");
    assert.deepEqual(snapshots, [
      "idle",
      "starting",
      "transitioning",
      "transitioning",
      "active",
      "transitioning",
      "finished",
    ]);
    unsubscribe();
  });

  for (const scenario of [
    {
      destination: 1,
      navigate: (tour: TourController<string>) => tour.advance(),
      name: "advance",
      start: 0,
    },
    {
      destination: 0,
      navigate: (tour: TourController<string>) => tour.previous(),
      name: "previous",
      start: 1,
    },
    {
      destination: 2,
      navigate: (tour: TourController<string>) => tour.goTo("step-21"),
      name: "goTo",
      start: 0,
    },
  ] as const) {
    test(`publishes ${scenario.name} content before the popover fade-in`, async () => {
      const driver = new StagedTransitionDriver();
      const tour = new TourController<string>(driver);
      const workflow = tour
        .create(`staged-${scenario.name}`)
        .step({ id: "step-19", content: "zero", target: targetResolver, title: "zero" })
        .step({ id: "step-20", content: "one", target: targetResolver, title: "one" })
        .step({ id: "step-21", content: "two", target: targetResolver, title: "two" })
        .build();
      await tour.start(workflow);
      if (scenario.start === 1) await tour.advance();

      const snapshots: string[] = [];
      const unsubscribe = tour.state.subscribe((state) => {
        snapshots.push(`${state.status}:${state.currentStep?.currentProps.content ?? "none"}`);
      });
      snapshots.length = 0;
      driver.pauseAdvanceShow();

      const navigation = scenario.navigate(tour);
      await flushMicrotasks();
      assert.equal(tour.state.get().status, "transitioning");
      assert.equal(
        tour.state.get().currentStep?.currentProps.content,
        ["zero", "one", "two"][scenario.start],
      );

      await driver.commitContent();
      assert.equal(tour.state.get().status, "transitioning");
      assert.equal(
        tour.state.get().currentStep?.currentProps.content,
        ["zero", "one", "two"][scenario.destination],
      );

      driver.finishShow();
      await navigation;
      assert.deepEqual(snapshots, [
        `transitioning:${["zero", "one", "two"][scenario.start]}`,
        `transitioning:${["zero", "one", "two"][scenario.destination]}`,
        `active:${["zero", "one", "two"][scenario.destination]}`,
      ]);
      unsubscribe();
    });
  }

  test("keeps committed control capabilities stable until the advance step commits", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("staged-capabilities")
      .step({ id: "step-22", content: "zero", target: targetResolver, title: "zero" })
      .step({
        id: "step-23",
        content: "one",
        controls: { advance: { state: "disabled" } },
        target: targetResolver,
        title: "one",
      })
      .build();
    await tour.start(workflow);
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: true, canCancel: true, canPrevious: false },
    );
    driver.pauseAdvanceShow();

    const navigation = tour.advance();
    await flushMicrotasks();
    assert.equal(tour.state.get().status, "transitioning");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: true, canPrevious: false },
    );

    await driver.commitContent();
    assert.equal(tour.state.get().status, "transitioning");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: true, canPrevious: false },
    );

    driver.finishShow();
    await navigation;
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: true, canCancel: true, canPrevious: true },
    );
  });

  test("allows public navigation when matching popover controls are disabled", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("programmatic-navigation")
      .step({
        id: "step-24",
        content: "zero",
        controls: { advance: { state: "disabled" } },
        target: targetResolver,
        title: "zero",
      })
      .step({
        id: "step-25",
        content: "one",
        controls: { previous: { state: "disabled" } },
        target: targetResolver,
        title: "one",
      })
      .step({ id: "step-26", content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.start(workflow);
    assert.deepEqual(
      { canAdvance: tour.state.get().canAdvance, canPrevious: tour.state.get().canPrevious },
      { canAdvance: true, canPrevious: false },
    );

    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.deepEqual(
      { canAdvance: tour.state.get().canAdvance, canPrevious: tour.state.get().canPrevious },
      { canAdvance: true, canPrevious: true },
    );

    await tour.previous();
    assert.equal(tour.state.get().currentStepIndex, 0);

    await tour.goTo("step-26");
    assert.equal(tour.state.get().currentStepIndex, 2);
  });

  test("allows action contexts to navigate when matching popover controls are disabled", async () => {
    const tour = createGlowTour<string>();
    let advanceContext!: StepContext<string>;
    let previousContext!: StepContext<string>;
    const workflow = tour
      .create("action-context-navigation")
      .step({
        id: "step-27",
        content: "zero",
        controls: { advance: { state: "disabled" } },
        target: targetResolver,
        title: "zero",
      })
      .do((context) => {
        advanceContext = context;
        return false;
      })
      .step({
        id: "step-28",
        content: "one",
        controls: { previous: { state: "disabled" } },
        target: targetResolver,
        title: "one",
      })
      .do((context) => {
        previousContext = context;
        return false;
      })
      .build();

    await tour.start(workflow);
    await advanceContext.advance();
    assert.equal(tour.state.get().currentStepIndex, 1);

    await previousContext.previous();
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("keeps the active workflow presentation until its replacement commits", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const active = tour
      .create("active")
      .step({ id: "step-29", content: "active", target: targetResolver, title: "active" })
      .build();
    const replacement = tour
      .create("replacement")
      .step({
        id: "step-30",
        content: "replacement",
        controls: { advance: { state: "disabled" } },
        target: targetResolver,
        title: "replacement",
      })
      .build();
    await tour.start(active);
    driver.pauseAdvanceShow();

    const replacing = tour.start(replacement);
    await flushMicrotasks();
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "active");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: true, canPrevious: false },
    );

    await driver.commitContent();
    assert.equal(tour.state.get().currentStep?.currentProps.content, "replacement");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: true, canPrevious: false },
    );

    driver.finishShow();
    await replacing;
    assert.equal(tour.state.get().canAdvance, true);
  });

  test("keeps the committed presentation through a reentrant starting replacement", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const active = tour
      .create("active")
      .step({ id: "step-31", content: "active", target: targetResolver, title: "active" })
      .build();
    const finalWorkflow = tour
      .create("final")
      .step({ id: "step-32", content: "final", target: targetResolver, title: "final" })
      .build();
    let finalRun: Promise<void> | null = null;
    const replacedDuringStart = tour
      .create("replaced-during-start", {
        onStart: () => {
          finalRun = tour.start(finalWorkflow);
        },
      })
      .step({ id: "step-33", content: "stale", target: targetResolver, title: "stale" })
      .build();
    await tour.start(active);
    driver.pauseAdvanceShow();

    const replacedRun = tour.start(replacedDuringStart);
    await flushMicrotasks();
    assert.equal(tour.state.get().name, "final");
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "active");
    assert.equal(tour.state.get().canAdvance, false);

    await driver.commitContent();
    assert.equal(tour.state.get().currentStep?.currentProps.content, "final");
    driver.finishShow();
    await replacedRun;
    await finalRun;
  });

  test("does not publish staged content after the transition is cancelled", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("cancel-staged-content")
      .step({ id: "step-34", content: "old", target: targetResolver, title: "old" })
      .step({ id: "step-35", content: "stale", target: targetResolver, title: "stale" })
      .build();
    await tour.start(workflow);
    driver.pauseAdvanceShow();

    const navigation = tour.advance();
    await flushMicrotasks();
    await tour.cancel();

    await assert.rejects(() => driver.commitContent(), { name: "AbortError" });
    driver.finishShow();
    await navigation;
    assert.equal(tour.state.get().status, "cancelled");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "old");
  });

  test("keeps previous blocked on the first step", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("first-step-previous")
      .step({ id: "step-36", content: "one", target: targetResolver, title: "one" })
      .build();
    await tour.start(workflow);
    await tour.previous();
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("awaits beforeLeave exactly once and exposes rejected hooks as errors", async () => {
    let calls = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("hooks")
      .step({ id: "step-38", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(async () => {
        calls += 1;
      })
      .build();
    await tour.start(workflow);
    await tour.advance();
    assert.equal(calls, 1);

    const failingTour = createGlowTour<string>();
    const failing = failingTour
      .create("failing-hook")
      .step({ id: "step-39", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => {
        throw new TypeError("hook failed");
      })
      .build();
    await failingTour.start(failing);
    await assert.rejects(() => failingTour.advance(), /hook failed/);
    assert.equal(failingTour.state.get().status, "error");
    assert.equal(failingTour.state.get().error?.message, "hook failed");
  });

  test("passes frozen hook contexts to beforeEnter and beforeLeave, never on cancel", async () => {
    const calls: { context: StepHookContext<string>; label: string }[] = [];
    const tour = createGlowTour<string>();
    const capture = (label: string) => async (context: StepHookContext<string>) => {
      await Promise.resolve();
      calls.push({ context, label });
    };
    const workflow = tour
      .create("hook-contexts")
      .step({
        id: "step-40",
        content: "first content",
        data: { count: 1 },
        overlay: { animation: { duration: 100, easing: "linear" }, color: "red" },
        target: targetResolver,
        title: "first title",
      })
      .do(({ props }) => {
        props.set((current) => ({ ...current, data: { count: 2 }, title: "current title" }));
      })
      .beforeEnter(capture("enter:first"))
      .beforeLeave(capture("leave:first"))
      .step({
        id: "step-41",
        content: "second content",
        target: targetResolver,
        title: "second title",
      })
      .beforeEnter(capture("enter:second"))
      .beforeLeave(capture("leave:second"))
      .build();

    await tour.start(workflow);
    await tour.advance();
    await tour.previous();
    await tour.cancel();

    assert.deepEqual(
      calls.map(({ context, label }) => `${label}:${context.direction}`),
      [
        "enter:first:advance",
        "leave:first:advance",
        "enter:second:advance",
        "leave:second:previous",
        "enter:first:previous",
      ],
    );
    const firstLeave = calls[1].context;
    assert.equal(firstLeave.props.get().title, "current title");
    assert.equal(firstLeave.initialProps.title, "first title");
    assert.deepEqual(firstLeave.initialProps.data, { count: 1 });
    assert.equal(Object.isFrozen(firstLeave.initialProps.data), true);
    assert.equal(Object.isFrozen(firstLeave.initialProps.overlay?.animation), true);
    for (const { context } of calls) {
      assert.equal(context.target, target);
      assert.equal(context.signal instanceof AbortSignal, true);
      assert.equal(Object.isFrozen(context), true);
      assert.equal(Object.isFrozen(context.initialProps), true);
      assert.equal("advance" in context, false);
      assert.equal("previous" in context, false);
      assert.equal("cancel" in context, false);
      assert.equal("behavior" in context, false);
    }
    assert.equal(Object.isFrozen(target), false);
  });

  test("ignores a second advance while the first transition is pending", async () => {
    const gate = deferred<void>();
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("concurrent")
      .step({ id: "step-42", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => gate.promise)
      .build();
    await tour.start(workflow);
    const first = tour.advance();
    const ignored = tour.advance();
    assert.equal(tour.state.get().status, "transitioning");
    await ignored;
    gate.resolve();
    await first;
    assert.equal(tour.state.get().status, "finished");
  });

  test("aborts stale target resolution when a newer workflow runs", async () => {
    const slow = deferred<HTMLElement | null>();
    const resolverStarted = deferred<void>();
    let aborted = false;
    const tour = createGlowTour<string>();
    const oldWorkflow = tour
      .create("old")
      .step({
        id: "step-43",
        content: "old",
        target: ({ signal }) => {
          resolverStarted.resolve();
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          return slow.promise;
        },
        title: "old",
      })
      .build();
    const current = tour
      .create("current")
      .step({ id: "step-44", content: "current", target: targetResolver, title: "current" })
      .build();

    const oldRun = tour.start(oldWorkflow);
    await resolverStarted.promise;
    await tour.start(current);
    slow.resolve(target);
    await oldRun;
    assert.equal(aborted, true);
    assert.equal(tour.state.get().name, "current");
    assert.equal(tour.state.get().status, "active");
  });

  test("cancels and disposes pending target resolution", async () => {
    const cancelGate = deferred<HTMLElement | null>();
    const cancelResolverStarted = deferred<void>();
    let cancelAborted = false;
    const cancelTour = createGlowTour<string>();
    const waiting = cancelTour
      .create("cancel")
      .step({
        id: "step-45",
        content: "one",
        target: ({ signal }) => {
          cancelResolverStarted.resolve();
          signal.addEventListener("abort", () => {
            cancelAborted = true;
          });
          return cancelGate.promise;
        },
        title: "one",
      })
      .build();
    const run = cancelTour.start(waiting);
    await cancelResolverStarted.promise;
    await cancelTour.cancel();
    cancelGate.resolve(target);
    await run;
    assert.equal(cancelAborted, true);
    assert.equal(cancelTour.state.get().status, "cancelled");

    const disposeGate = deferred<HTMLElement | null>();
    const disposeResolverStarted = deferred<void>();
    let disposeAborted = false;
    const disposeTour = createGlowTour<string>();
    const disposable = disposeTour
      .create("dispose")
      .step({
        id: "step-46",
        content: "one",
        target: ({ signal }) => {
          disposeResolverStarted.resolve();
          signal.addEventListener("abort", () => {
            disposeAborted = true;
          });
          return disposeGate.promise;
        },
        title: "one",
      })
      .build();
    const pending = disposeTour.start(disposable);
    await disposeResolverStarted.promise;
    disposeTour.dispose();
    disposeGate.resolve(target);
    await pending;
    assert.equal(disposeAborted, true);
    await assert.rejects(() => disposeTour.advance(), /disposed/);
    disposeTour.dispose();
  });

  test("aborts a pending wait-strategy retry without polling again", async () => {
    const firstAttempt = deferred<void>();
    const timerListenerAdded = deferred<void>();
    let attempts = 0;
    const listenerCounts = { added: 0, removed: 0 };
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("abort-wait")
      .step({
        id: "step-47",
        behavior: { missingTarget: { strategy: "wait", timeout: 60_000 } },
        content: "one",
        target: ({ signal }) => {
          attempts += 1;
          if (attempts === 1) {
            trackAbortListeners(signal, listenerCounts, timerListenerAdded.resolve);
          }
          firstAttempt.resolve();
          return null;
        },
        title: "one",
      })
      .build();

    const run = tour.start(workflow);
    await firstAttempt.promise;
    await timerListenerAdded.promise;
    await tour.cancel();
    await run;

    assert.equal(attempts, 1);
    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
    assert.equal(tour.state.get().status, "cancelled");
  });

  test("shows a detached step on the body without polling when its target is missing", async () => {
    const realm = createRealmDocument();
    const body = realm.element();
    const attachedTarget = realm.element();
    Object.assign(realm.document, { body });
    const driver = new RecordingDriver();
    const shown: { allowInteraction: boolean; detached: boolean; target: HTMLElement | null }[] =
      [];
    driver.show = (step: ActiveStep<string>) => {
      shown.push({
        allowInteraction: step.allowsInteraction(),
        detached: step.detached,
        target: step.target,
      });
    };
    let attempts = 0;
    let actionTarget: HTMLElement | null = null;
    const tour = new TourController<string>(driver, { assertCanRun: () => realm.document });
    await tour.start(
      tour
        .create("detached")
        .step({
          id: "step-detached",
          behavior: {
            allowInteraction: true,
            missingTarget: { strategy: "detached", timeout: 60_000 },
          },
          content: "one",
          target: () => {
            attempts += 1;
            return null;
          },
          title: "one",
        })
        .do(({ target }) => {
          actionTarget = target;
        })
        .step({ id: "step-attached", content: "two", target: () => attachedTarget, title: "two" })
        .build(),
    );

    assert.equal(attempts, 1);
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStep?.target, body);
    assert.equal(actionTarget, body);
    assert.deepEqual(shown, [{ allowInteraction: false, detached: true, target: body }]);

    await tour.advance();
    assert.deepEqual(shown[1], {
      allowInteraction: false,
      detached: false,
      target: attachedTarget,
    });
  });

  test("detaches a step whose target disconnects for good", async () => {
    const realm = createRealmDocument();
    const body = realm.element();
    Object.assign(realm.document, { body });
    const driver = new RecordingDriver();
    const firstTarget = realm.element();
    let resolvedTarget: HTMLElement | null = firstTarget;
    const tour = new TourController<string>(driver, { assertCanRun: () => realm.document });
    await tour.start(
      tour
        .create("recover-detached")
        .step({
          id: "step-recover-detached",
          behavior: { missingTarget: { strategy: "detached" } },
          content: "one",
          target: () => resolvedTarget,
          title: "one",
        })
        .build(),
    );
    assert.ok(driver.commands);

    resolvedTarget = null;
    await driver.commands.targetDisconnected(firstTarget);

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().currentStep?.target, body);
    assert.deepEqual(driver.retargetedTargets, [body]);
  });

  test("resolves selector, sync and async targets and applies error, skip, and wait strategies", async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { querySelector: (selector: string) => (selector === "#found" ? target : null) },
    });

    try {
      const selectorTour = createGlowTour<string>();
      await selectorTour.start(
        selectorTour
          .create("selector")
          .step({ id: "step-48", content: "one", target: "#found", title: "one" })
          .build(),
      );
      assert.equal(selectorTour.state.get().currentStep?.target, target);

      const syncTour = createGlowTour<string>();
      await syncTour.start(
        syncTour
          .create("sync")
          .step({ id: "step-49", content: "one", target: () => target, title: "one" })
          .build(),
      );
      assert.equal(syncTour.state.get().status, "active");

      const asyncTour = createGlowTour<string>();
      await asyncTour.start(
        asyncTour
          .create("async")
          .step({ id: "step-50", content: "one", target: async () => target, title: "one" })
          .build(),
      );
      assert.equal(asyncTour.state.get().status, "active");

      const errorTour = createGlowTour<string>();
      await assert.rejects(
        () =>
          errorTour.start(
            errorTour
              .create("error")
              .step({ id: "step-51", content: "one", target: () => null, title: "one" })
              .build(),
          ),
        /Missing target/,
      );
      assert.equal(errorTour.state.get().status, "error");

      const skipTour = createGlowTour<string>();
      await skipTour.start(
        skipTour
          .create("skip")
          .step({
            id: "step-52",
            behavior: { missingTarget: { strategy: "skip" } },
            content: "one",
            target: () => null,
            title: "one",
          })
          .step({ id: "step-53", content: "two", target: targetResolver, title: "two" })
          .build(),
      );
      assert.equal(skipTour.state.get().currentStepIndex, 1);

      let attempts = 0;
      const waitTour = createGlowTour<string>();
      await waitTour.start(
        waitTour
          .create("wait")
          .step({
            id: "step-54",
            behavior: { missingTarget: { strategy: "wait", timeout: 100 } },
            content: "one",
            target: () => (++attempts === 2 ? target : null),
            title: "one",
          })
          .build(),
      );
      assert.equal(attempts, 2);
    } finally {
      if (documentDescriptor) {
        Object.defineProperty(globalThis, "document", documentDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "document");
      }
    }
  });

  test("updates active snapshots without mutating definitions", async () => {
    const tour = createGlowTour<string>();
    let activeProps!: StepContext<string>["props"];
    const workflow = tour
      .create("update")
      .step({
        id: "step-55",
        content: "one",
        data: { value: 1 },
        target: targetResolver,
        title: "one",
      })
      .do(({ props }) => {
        activeProps = props;
      })
      .build();
    await tour.start(workflow);
    activeProps.set((props) => ({ ...props, data: { value: 2 }, title: "two" }));
    assert.equal(tour.state.get().currentStep?.currentProps.title, "two");
    assert.deepEqual(workflow.steps[0].props.data, { value: 1 });
  });

  test("keeps dynamic props on reentry unless beforeEnter resets them", async () => {
    const reenterFirstStep = async (reset: "none" | "all" | "data") => {
      const tour = createGlowTour<string>();
      let activeProps!: StepContext<string>["props"];
      const first = tour
        .create("props-on-reentry")
        .step({
          id: "step-56",
          content: "one",
          data: { visits: 0 },
          target: targetResolver,
          title: "initial",
        })
        .do(({ props }) => {
          activeProps = props;
        });
      if (reset === "all") {
        first.beforeEnter(({ props, initialProps }) => props.set(initialProps));
      }
      if (reset === "data") {
        first.beforeEnter(({ props, initialProps }) =>
          props.set((current) => ({ ...current, data: initialProps.data })),
        );
      }
      const workflow = first
        .step({ id: "step-57", content: "two", target: targetResolver, title: "two" })
        .build();

      await tour.start(workflow);
      activeProps.set((props) => ({ ...props, data: { visits: 1 }, title: "mutated" }));
      await tour.advance();
      await tour.previous();

      const step = tour.state.get().currentStep;
      assert.ok(step);
      return { data: step.currentProps.data, title: step.currentProps.title };
    };

    assert.deepEqual(await reenterFirstStep("none"), { data: { visits: 1 }, title: "mutated" });
    assert.deepEqual(await reenterFirstStep("all"), { data: { visits: 0 }, title: "initial" });
    assert.deepEqual(await reenterFirstStep("data"), { data: { visits: 0 }, title: "mutated" });
  });

  test("keeps a behavior changed through props on reentry, and restarts from the definition on a new run", async () => {
    const shown: boolean[] = [];
    class InteractionDriver extends NoopTourViewDriver<string> {
      override show(...args: Parameters<NoopTourViewDriver<string>["show"]>) {
        const step: ActiveStep<string> = args[0];
        shown.push(step.allowsInteraction());
        return super.show(...args);
      }
    }
    const tour = new TourController<string>(new InteractionDriver());
    let context!: StepContext<string>;
    const workflow = tour
      .create("interaction-on-reentry")
      .step({
        id: "interaction-1",
        behavior: { allowInteraction: true },
        content: "one",
        target: targetResolver,
        title: "one",
      })
      .do((stepContext) => {
        context = stepContext;
      })
      .step({ id: "interaction-2", content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.start(workflow);
    context.props.update({ behavior: { allowInteraction: false } });
    assert.equal(tour.state.get().currentStep?.currentProps.behavior?.allowInteraction, false);
    assert.throws(
      () => context.props.update({ behavior: { missingTarget: { timeout: -1 } } }),
      /steps\[0\]\.behavior\.missingTarget\.timeout/,
    );
    await tour.advance();
    await tour.previous();
    await tour.advance();
    context.props.update({ behavior: { allowInteraction: true } });
    await tour.previous();
    context.props.update({ behavior: { allowInteraction: false } });
    await tour.start(workflow);

    assert.deepEqual(shown, [true, false, false, false, true, true]);
  });

  test("runs beforeEnter after target resolution and before the step is shown or published", async () => {
    const order: string[] = [];
    const publishedTitles: (string | undefined)[] = [];
    let resolveCalls = 0;
    const driver = new (class extends RecordingDriver {
      override show(step: ActiveStep<string>) {
        order.push(`show:${step.props.get().title}`);
        super.show(step);
      }
    })();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("enter-order", {
        onEvent: (event) => {
          if (event.type === "step:enter") order.push("step:enter");
        },
      })
      .step({
        id: "enter-order",
        content: "one",
        target: () => {
          resolveCalls += 1;
          return target;
        },
        title: "initial",
      })
      .beforeEnter(({ props }) => {
        order.push(`beforeEnter:${resolveCalls > 0}:${tour.state.get().status}`);
        props.set((current) => ({ ...current, title: "entered" }));
      })
      .do(() => {
        order.push("action");
      })
      .build();
    tour.state.subscribe((state) => {
      publishedTitles.push(state.currentStep?.currentProps.title);
    });

    await tour.start(workflow);

    assert.deepEqual(order, [
      "beforeEnter:true:transitioning",
      "show:entered",
      "step:enter",
      "action",
    ]);
    assert.equal(publishedTitles.includes("initial"), false);
    assert.equal(tour.state.get().currentStep?.currentProps.title, "entered");
  });

  test("does not run beforeEnter for a step skipped for a missing target", async () => {
    const entered: string[] = [];
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("skip-enter")
      .step({ id: "one", content: "one", target: targetResolver, title: "one" })
      .step({
        id: "two",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "two",
        target: () => null,
        title: "two",
      })
      .beforeEnter(() => {
        entered.push("two");
      })
      .step({ id: "three", content: "three", target: targetResolver, title: "three" })
      .beforeEnter(({ direction }) => {
        entered.push(`three:${direction}`);
      })
      .build();

    await tour.start(workflow);
    await tour.advance();

    assert.deepEqual(entered, ["three:advance"]);
    assert.equal(tour.state.get().currentStepIndex, 2);
  });

  test("stays on the current step without events when beforeLeave aborts, synchronously or not", async () => {
    const events: string[] = [];
    let blockAdvance = true;
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: (event) => events.push(event.type),
    });
    const workflow = tour
      .create("aborted-leave")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .beforeLeave(({ abort }) => {
        if (blockAdvance) abort();
      })
      .step({ id: "second", content: "2", target: targetResolver, title: "2" })
      .beforeLeave(async ({ abort }) => {
        await Promise.resolve();
        abort();
      })
      .build();

    await tour.start(workflow);
    events.length = 0;
    await tour.advance();
    assert.deepEqual(events, []);
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().status, "active");

    blockAdvance = false;
    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 1);
    events.length = 0;
    await tour.previous();
    assert.deepEqual(events, []);
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().direction, "advance");
  });

  test("keeps the tour on its last step when beforeLeave aborts finishing", async () => {
    let finishes = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("aborted-finish", {
        onFinish: () => {
          finishes += 1;
        },
      })
      .step({ id: "only", content: "1", target: targetResolver, title: "1" })
      .beforeLeave(({ abort }) => abort())
      .build();

    await tour.start(workflow);
    await tour.advance();

    assert.equal(finishes, 0);
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("stays on the current step without step:skip when beforeEnter of the next step aborts", async () => {
    const events: string[] = [];
    let entered = 0;
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: (event) => events.push(`${event.type}:${event.stepId}`),
    });
    const workflow = tour
      .create("aborted-enter")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .step({
        id: "gone",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "2",
        target: () => null,
        title: "2",
      })
      .step({ id: "blocked", content: "3", target: targetResolver, title: "3" })
      .beforeEnter(({ abort }) => {
        entered += 1;
        abort();
      })
      .build();

    await tour.start(workflow);
    events.length = 0;
    await tour.advance();

    assert.equal(entered, 1);
    assert.deepEqual(events, []);
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().status, "active");
  });

  test("ignores abort() called after the hook has settled", async () => {
    let lateAbort: (() => void) | undefined;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("late-abort")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .beforeLeave(({ abort }) => {
        lateAbort = abort;
      })
      .step({ id: "second", content: "2", target: targetResolver, title: "2" })
      .build();

    await tour.start(workflow);
    await tour.advance();
    lateAbort?.();

    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");
  });

  test("stays on the current step when going back skips past the first step", async () => {
    let firstAvailable = true;
    const events: string[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: (event) => events.push(event.type),
    });
    const workflow = tour
      .create("back-past-start")
      .step({
        id: "first",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "1",
        target: () => (firstAvailable ? target : null),
        title: "1",
      })
      .step({ id: "second", content: "2", target: targetResolver, title: "2" })
      .build();

    await tour.start(workflow);
    await tour.advance();
    firstAvailable = false;
    events.length = 0;
    await tour.previous();

    assert.deepEqual(events, []);
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");
  });

  test("exposes the arrival direction to actions and the departure direction to beforeLeave", async () => {
    const seen: string[] = [];
    const tour = createGlowTour<string>();
    const builder = tour.create("directions");
    for (const id of ["one", "two", "three"]) {
      builder
        .step({ id, content: id, target: targetResolver, title: id })
        .do(({ direction }) => {
          seen.push(`action:${id}:${direction}`);
        })
        .beforeLeave(({ direction }) => {
          seen.push(`leave:${id}:${direction}`);
        });
    }
    const workflow = builder.build();

    await tour.start(workflow);
    await tour.goTo("three");
    await tour.goTo("two");
    await tour.advance();
    await tour.advance();

    assert.deepEqual(seen, [
      "action:one:advance",
      "leave:one:advance",
      "action:three:advance",
      "leave:three:previous",
      "action:two:previous",
      "leave:two:advance",
      "action:three:advance",
      "leave:three:advance",
    ]);
    assert.equal(tour.state.get().status, "finished");
  });

  test("exposes frozen initial props to step actions", async () => {
    let context!: StepContext<string>;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("initial-props")
      .step({ id: "one", content: "one", data: { value: 1 }, target: targetResolver, title: "one" })
      .do((stepContext) => {
        context = stepContext;
        stepContext.props.set((current) => ({ ...current, data: { value: 2 }, title: "changed" }));
      })
      .build();

    await tour.start(workflow);

    assert.equal(context.initialProps.title, "one");
    assert.deepEqual(context.initialProps.data, { value: 1 });
    assert.equal(context.props.get().title, "changed");
    assert.equal(Object.isFrozen(context.initialProps), true);
    assert.equal(Object.isFrozen(context.initialProps.data), true);
  });

  test("runs empty workflow lifecycle callbacks exactly once", async () => {
    let starts = 0;
    let finishes = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("empty", {
        onFinish: () => {
          finishes += 1;
        },
        onStart: () => {
          starts += 1;
        },
      })
      .build();
    await tour.start(workflow);
    assert.equal(starts, 1);
    assert.equal(finishes, 1);
    assert.equal(tour.state.get().status, "finished");
  });

  test("runs definition actions in order and lets the action context advance", async () => {
    const calls: string[] = [];
    const titles: string[] = [];
    const tour = createGlowTour<string>();
    tour.state.subscribe((state) => {
      const title = state.currentStep?.currentProps.title;
      if (title) titles.push(title);
    });
    const workflow = tour
      .create("actions")
      .step({ id: "step-58", content: "one", target: targetResolver, title: "one" })
      .do(async ({ props }) => {
        assert.equal(typeof props.set, "function");
        calls.push(String(props.get().title));
        props.set((current) => ({ ...current, title: "updated" }));
        return true;
      })
      .do(({ advance }) => advance())
      .step({ id: "step-59", content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.start(workflow);

    assert.deepEqual(calls, ["one"]);
    assert.equal(titles.includes("updated"), true);
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(workflow.steps[0].props.title, "one");
    assert.equal(tour.state.get().status, "active");
  });

  test("stops the current action chain after a context command", async () => {
    for (const command of ["advance", "previous", "cancel"] as const) {
      const calls: string[] = [];
      const tour = createGlowTour<string>();
      let actionStep = tour
        .create(`context-${command}`)
        .step({ id: "step-60", content: "one", target: targetResolver, title: "one" });
      if (command === "previous") {
        actionStep = actionStep.step({
          id: "step-61",
          content: "two",
          target: targetResolver,
          title: "two",
        });
      }
      const workflow = actionStep
        .do((context) => context[command]())
        .do(() => {
          calls.push("stale");
        })
        .step({ id: "step-62", content: "three", target: targetResolver, title: "three" })
        .build();

      if (command === "previous") {
        await tour.start(workflow);
        await tour.advance();
      } else {
        await tour.start(workflow);
      }

      assert.deepEqual(calls, [], command);
      assert.equal(tour.state.get().status, command === "cancel" ? "cancelled" : "active");
    }
  });

  test("turns action errors into terminal controller errors and clears the view", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("action-error")
      .step({ id: "step-63", content: "one", target: targetResolver, title: "one" })
      .do(() => {
        throw new TypeError("action failed");
      })
      .build();

    await assert.rejects(() => tour.start(workflow), /action failed/);
    assert.equal(tour.state.get().status, "error");
    assert.equal(tour.state.get().error?.message, "action failed");
    assert.equal(driver.clearCalls, 1);
    await tour.cancel();
    assert.equal(tour.state.get().status, "error");
  });

  test("turns reported event errors into terminal controller errors", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("event-error")
      .step({ id: "step-64", content: "one", target: targetResolver, title: "one" })
      .build();
    await tour.start(workflow);

    assert.ok(driver.commands);
    await driver.commands?.reportError(new TypeError("event failed"));

    assert.equal(tour.state.get().status, "error");
    assert.equal(tour.state.get().error?.message, "event failed");
    assert.equal(driver.clearCalls, 1);
  });

  test("recovers a target reconnected within the grace period without clearing, replaying actions, or leaving 'active'", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const initialTarget = {} as HTMLElement;
    const replacementTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = initialTarget;
    let actions = 0;
    const workflow = tour
      .create("recover-wait")
      .step({
        id: "step-65",
        behavior: { missingTarget: { strategy: "wait", timeout: 5000 } },
        content: "one",
        target: () => resolvedTarget,
        title: "initial",
      })
      .do(({ props }) => {
        actions += 1;
        props.set((current) => ({ ...current, title: "dynamic" }));
      })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    const recovery = driver.commands.targetDisconnected(initialTarget);
    await flushMicrotasks();
    // A same-frame disconnection must not bounce the public status through
    // "transitioning" — that would be the exact flicker the grace period
    // exists to hide from consumers.
    assert.equal(tour.state.get().status, "active");
    assert.equal(driver.clearCalls, 0);
    await driver.commands.targetDisconnected(initialTarget);
    assert.equal(driver.clearCalls, 0);

    resolvedTarget = replacementTarget;
    await recovery;

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStep?.target, replacementTarget);
    assert.equal(tour.state.get().currentStep?.currentProps.title, "dynamic");
    assert.equal(actions, 1);
    assert.equal(driver.showCalls, 1);
    assert.equal(driver.clearCalls, 0);
    assert.equal(driver.retargetCalls, 1);
  });

  test("recovers a direct element after it reconnects within the grace period", async () => {
    const driver = new RecordingDriver();
    const realm = createRealmDocument();
    const directTarget = realm.element();
    const tour = new TourController<string>(driver, { assertCanRun: () => realm.document });
    const workflow = tour
      .create("recover-direct")
      .step({
        id: "step-66",
        behavior: { missingTarget: { strategy: "wait", timeout: 5000 } },
        content: "one",
        target: directTarget,
        title: "one",
      })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    (directTarget as unknown as { isConnected: boolean }).isConnected = false;
    const recovery = driver.commands.targetDisconnected(directTarget);
    await flushMicrotasks();
    (directTarget as unknown as { isConnected: boolean }).isConnected = true;
    await recovery;

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStep?.target, directTarget);
    assert.equal(driver.showCalls, 1);
    assert.equal(driver.clearCalls, 0);
    assert.equal(driver.retargetCalls, 1);
  });

  test("skips a disconnected target in the current direction", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstTarget = {} as HTMLElement;
    const secondTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = firstTarget;
    const workflow = tour
      .create("recover-skip")
      .step({
        id: "step-67",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .step({ id: "step-68", content: "two", target: () => secondTarget, title: "two" })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    await driver.commands.targetDisconnected(firstTarget);

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().currentStep?.target, secondTarget);
  });

  test("uses the normal cancellation boundary after skipping a disconnected target backwards", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstTarget = {} as HTMLElement;
    const secondTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = firstTarget;
    let cancelTarget: HTMLElement | null = null;
    const workflow = tour
      .create("recover-reverse-skip", {
        onCancel: ({ step }) => {
          cancelTarget = step?.target ?? null;
        },
      })
      .step({
        id: "step-69",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .step({ id: "step-70", content: "two", target: () => secondTarget, title: "two" })
      .build();
    await tour.start(workflow);
    await tour.advance();
    await tour.previous();
    assert.ok(driver.commands);

    resolvedTarget = null;
    await driver.commands.targetDisconnected(firstTarget);

    assert.equal(tour.state.get().status, "cancelled");
    assert.equal(cancelTarget, firstTarget);
  });

  test("reports an indexed error when active target recovery uses the error strategy", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const initialTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = initialTarget;
    const workflow = tour
      .create("recover-error")
      .step({ id: "step-73", content: "one", target: () => resolvedTarget, title: "one" })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    await driver.commands.targetDisconnected(initialTarget);

    assert.equal(tour.state.get().status, "error");
    assert.match(tour.state.get().error?.message ?? "", /Missing target at steps\[0\]/);
    assert.equal(driver.clearCalls, 1);
  });

  test("reports an indexed error when active target recovery wait times out", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const initialTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = initialTarget;
    const workflow = tour
      .create("recover-timeout")
      .step({
        id: "step-74",
        behavior: { missingTarget: { strategy: "wait", timeout: 0 } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    await driver.commands.targetDisconnected(initialTarget);

    assert.equal(tour.state.get().status, "error");
    assert.match(tour.state.get().error?.message ?? "", /Missing target at steps\[0\]/);
  });

  test("counts the grace period against the wait strategy's own budget instead of adding it on top", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const initialTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = initialTarget;
    let resolveCalls = 0;
    const targetTimeout = TARGET_LOSS_GRACE_MS + 150;
    const workflow = tour
      .create("recover-budget")
      .step({
        id: "step-budget",
        behavior: { missingTarget: { strategy: "wait", timeout: targetTimeout } },
        content: "one",
        target: () => {
          resolveCalls += 1;
          return resolvedTarget;
        },
        title: "one",
      })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);
    resolveCalls = 0;

    resolvedTarget = null;
    const startedAt = Date.now();
    await driver.commands.targetDisconnected(initialTarget);
    const elapsedMs = Date.now() - startedAt;

    assert.equal(tour.state.get().status, "error");
    // If the grace period were added on top of `targetTimeout` instead of
    // being deducted from it, the total wait (and so the attempt count and
    // elapsed time) would run for roughly `targetTimeout + grace` instead of
    // `targetTimeout` — comfortably outside this bound.
    const nonDoubledCeiling = targetTimeout + TARGET_LOSS_GRACE_MS / 2;
    assert.ok(
      elapsedMs < nonDoubledCeiling,
      `expected the recovery to finish within ~${targetTimeout}ms, took ${elapsedMs}ms`,
    );
    assert.ok(resolveCalls > 1, "expected more than the single immediate resolve attempt");
  });

  test("honors a command received while frozen and cancels the pending recovery", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstTarget = {} as HTMLElement;
    const secondTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = firstTarget;
    const workflow = tour
      .create("recover-command-wins")
      .step({
        id: "step-cmd-1",
        behavior: { missingTarget: { strategy: "wait", timeout: 5000 } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .step({ id: "step-cmd-2", content: "two", target: () => secondTarget, title: "two" })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    const recovery = driver.commands.targetDisconnected(firstTarget);
    await flushMicrotasks();
    // Still frozen, still "active": the advance button reads as usable.
    assert.equal(tour.state.get().status, "active");

    await tour.advance();
    await recovery;

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().currentStep?.target, secondTarget);
  });

  test("keeps the popover usable during a wait freeze that outlives the grace period", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstTarget = {} as HTMLElement;
    const secondTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = firstTarget;
    const workflow = tour
      .create("recover-wait-command")
      .step({
        id: "step-wait-cmd-1",
        behavior: { missingTarget: { strategy: "wait", timeout: 5000 } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .step({ id: "step-wait-cmd-2", content: "two", target: () => secondTarget, title: "two" })
      .build();
    await tour.start(workflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    const recovery = driver.commands.targetDisconnected(firstTarget);
    await delay(TARGET_LOSS_GRACE_MS * 2);

    // Past the grace period the step is deep into its "wait" budget, yet the
    // presentation is still frozen on screen. A frozen popover whose buttons
    // have gone dead is the trap this guards against.
    assert.equal(tour.state.get().status, "active");
    assert.equal(driver.clearCalls, 0);

    await tour.advance();
    await recovery;

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().currentStep?.target, secondTarget);
  });

  test("ignores stale and repeated target-disconnected notifications", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstTarget = {} as HTMLElement;
    const secondTarget = {} as HTMLElement;
    const workflow = tour
      .create("recover-stale")
      .step({ id: "step-75", content: "one", target: () => firstTarget, title: "one" })
      .step({ id: "step-76", content: "two", target: () => secondTarget, title: "two" })
      .build();
    await tour.start(workflow);
    await tour.advance();
    assert.ok(driver.commands);

    await driver.commands.targetDisconnected(firstTarget);
    await driver.commands.targetDisconnected(firstTarget);

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(driver.clearCalls, 0);
  });

  test("does not let a superseded target recovery commit after a new run", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const initialTarget = {} as HTMLElement;
    const recoveredTarget = {} as HTMLElement;
    const replacementWorkflowTarget = {} as HTMLElement;
    let resolvedTarget: HTMLElement | null = initialTarget;
    const oldWorkflow = tour
      .create("recover-old")
      .step({
        id: "step-77",
        behavior: { missingTarget: { strategy: "wait", timeout: 100 } },
        content: "one",
        target: () => resolvedTarget,
        title: "one",
      })
      .build();
    const replacementWorkflow = tour
      .create("recover-new")
      .step({
        id: "step-78",
        content: "two",
        target: () => replacementWorkflowTarget,
        title: "two",
      })
      .build();
    await tour.start(oldWorkflow);
    assert.ok(driver.commands);

    resolvedTarget = null;
    const recovery = driver.commands.targetDisconnected(initialTarget);
    await flushMicrotasks();
    await tour.start(replacementWorkflow);
    resolvedTarget = recoveredTarget;
    await recovery;

    assert.equal(tour.state.get().name, "recover-new");
    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStep?.target, replacementWorkflowTarget);
  });

  test("keeps disabled navigation props presentation-only in public state", async () => {
    const tour = createGlowTour<string>();
    let firstStepProps!: StepContext<string>["props"];
    const workflow = tour
      .create("disabled-navigation")
      .step({
        id: "step-79",
        content: "one",
        controls: { advance: { state: "disabled" } },
        target: targetResolver,
        title: "one",
      })
      .do(({ props }) => {
        firstStepProps = props;
      })
      .step({
        id: "step-80",
        content: "two",
        controls: { previous: { state: "disabled" } },
        target: targetResolver,
        title: "two",
      })
      .build();

    await tour.start(workflow);
    assert.equal(tour.state.get().canAdvance, true);
    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().canPrevious, true);

    firstStepProps.set((props) => ({
      ...props,
      controls: { advance: { state: "enabled" } },
    }));
    await tour.previous();
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("awaits beforeLeave before goTo navigation", async () => {
    const hook = deferred<void>();
    let calls = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("go-to-hook")
      .step({ id: "step-81", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => {
        calls += 1;
        return hook.promise;
      })
      .step({ id: "step-82", content: "two", target: targetResolver, title: "two" })
      .build();
    await tour.start(workflow);

    const navigation = tour.goTo("step-82");
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(calls, 1);
    // Ignored while a transition is in progress, even for an id no step carries.
    await tour.goTo("step-99");
    hook.resolve();
    await navigation;
    assert.equal(tour.state.get().currentStepIndex, 1);
  });

  test("normalizes view failures, cleans active work, and rejects", async () => {
    const driver = new RecordingDriver();
    driver.showError = new TypeError("view failed");
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("view-error")
      .step({ id: "step-83", content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(() => tour.start(workflow), /view failed/);
    assert.equal(tour.state.get().status, "error");
    assert.equal(driver.showCalls, 1);
    assert.equal(driver.clearCalls, 1);
  });

  test("publishes only error when rendering fails and preserves the exact rendering error", async () => {
    const renderingError = new TypeError("rendering failed");
    const driver = new RecordingDriver();
    driver.showError = renderingError;
    driver.clearError = new Error("cleanup failed");
    const tour = new TourController<string>(driver);
    const statuses: string[] = [];
    tour.state.subscribe((state) => statuses.push(state.status));
    const workflow = tour
      .create("rendering-error")
      .step({ id: "step-84", content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(
      () => tour.start(workflow),
      (error) => error === renderingError,
    );

    assert.equal(tour.state.get().status, "error");
    assert.equal(tour.state.get().error, renderingError);
    assert.equal(driver.clearCalls, 1);
    assert.equal(statuses.includes("active"), false);
  });

  test("publishes one terminal disposed state and stops a stale reentrant publication", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const firstSubscriberStatuses: string[] = [];
    const secondSubscriberStatuses: string[] = [];
    let disposeDuringPublication = false;
    tour.state.subscribe((state) => {
      firstSubscriberStatuses.push(state.status);
      if (disposeDuringPublication && state.status === "transitioning") tour.dispose();
    });
    tour.state.subscribe((state) => {
      secondSubscriberStatuses.push(state.status);
    });
    const workflow = tour
      .create("dispose")
      .step({ id: "step-85", content: "one", target: targetResolver, title: "one" })
      .build();
    await tour.start(workflow);

    assert.ok(firstSubscriberStatuses.includes("active"));
    assert.ok(secondSubscriberStatuses.includes("active"));
    firstSubscriberStatuses.length = 0;
    secondSubscriberStatuses.length = 0;

    disposeDuringPublication = true;
    await tour.advance();
    tour.dispose();

    assert.deepEqual(firstSubscriberStatuses, ["transitioning", "disposed"]);
    assert.deepEqual(secondSubscriberStatuses, ["disposed"]);
    assert.equal(
      firstSubscriberStatuses.filter((status) => status === "disposed").length +
        secondSubscriberStatuses.filter((status) => status === "disposed").length,
      2,
    );
    assert.deepEqual(tour.state.get(), {
      canAdvance: false,
      canCancel: false,
      canPrevious: false,
      currentStep: null,
      currentStepIndex: -1,
      direction: "advance",
      error: null,
      isFirstStep: false,
      isLastStep: false,
      name: "",
      status: "disposed",
      totalSteps: 0,
    });

    let lateSubscriptionNotifications = 0;
    const unsubscribe = tour.state.subscribe(() => {
      lateSubscriptionNotifications += 1;
    });
    unsubscribe();
    unsubscribe();

    assert.equal(lateSubscriptionNotifications, 0);
    assert.equal(driver.disposeCalls, 1);
    await assert.rejects(() => tour.start(workflow), /disposed/);
    await assert.rejects(() => tour.advance(), /disposed/);
    await assert.rejects(() => tour.previous(), /disposed/);
    await assert.rejects(() => tour.goTo("step"), /disposed/);
    await assert.rejects(() => tour.cancel(), /disposed/);
  });

  test("goes to a step by id, in the direction of that step", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("go-to-id")
      .step({ id: "intro", content: "0", target: targetResolver, title: "0" })
      .step({ id: "profile", content: "1", target: targetResolver, title: "1" })
      .step({ id: "billing", content: "2", target: targetResolver, title: "2" })
      .build();

    await tour.goTo("billing");
    assert.equal(tour.state.get().status, "idle");

    await tour.start(workflow);
    await tour.goTo("billing");
    assert.equal(tour.state.get().currentStepIndex, 2);
    assert.equal(tour.state.get().direction, "advance");

    await tour.goTo("billing");
    assert.equal(tour.state.get().currentStepIndex, 2);

    await tour.goTo("profile");
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().direction, "previous");

    await assert.rejects(
      () => tour.goTo("pricing"),
      /Workflow "go-to-id" has no step with id "pricing"\./,
    );
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");
  });

  test("lets a step action go to a step by id and stops its remaining actions", async () => {
    const calls: string[] = [];
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("context-go-to")
      .step({ id: "intro", content: "0", target: targetResolver, title: "0" })
      .do(({ goTo }) => goTo("billing"))
      .do(() => {
        calls.push("sentinel");
      })
      .step({ id: "profile", content: "1", target: targetResolver, title: "1" })
      .step({ id: "billing", content: "2", target: targetResolver, title: "2" })
      .build();

    await tour.start(workflow);

    assert.equal(tour.state.get().currentStepIndex, 2);
    assert.deepEqual(calls, []);
  });

  test("fails the tour when a step action goes to an unknown step id", async () => {
    const events: string[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: (event) => events.push(event.type),
    });
    const workflow = tour
      .create("context-go-to-unknown")
      .step({ id: "intro", content: "0", target: targetResolver, title: "0" })
      .do(({ goTo }) => goTo("pricing"))
      .build();

    await assert.rejects(() => tour.start(workflow), /has no step with id "pricing"/);

    assert.equal(tour.state.get().status, "error");
    assert.equal(events.at(-1), "tour:error");
  });

  test("skips missing targets in the active navigation direction", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("reverse-skip")
      .step({ id: "step-86", content: "zero", target: targetResolver, title: "zero" })
      .step({
        id: "step-87",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "one",
        target: () => null,
        title: "one",
      })
      .step({ id: "step-88", content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.start(workflow);
    await tour.goTo("step-88");
    await tour.previous();

    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().direction, "previous");
  });

  test("treats an unexpected resolver AbortError as terminal", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("unexpected-abort")
      .step({
        id: "step-89",
        content: "one",
        target: () => {
          throw new DOMException("resolver aborted itself", "AbortError");
        },
        title: "one",
      })
      .build();

    await assert.rejects(() => tour.start(workflow), /resolver aborted itself/);
    assert.equal(tour.state.get().status, "error");
  });

  test("cancel invalidates a pending transition without stale state changes", async () => {
    const hook = deferred<void>();
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("cancel-transition")
      .step({ id: "step-90", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => hook.promise)
      .step({ id: "step-91", content: "two", target: targetResolver, title: "two" })
      .build();
    await tour.start(workflow);

    const transition = tour.advance();
    await tour.cancel();
    hook.resolve();
    await transition;

    assert.equal(tour.state.get().status, "cancelled");
    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("does not show a step when the tour is cancelled during its beforeEnter", async () => {
    const started = deferred<void>();
    const hook = deferred<void>();
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("cancel-enter")
      .step({ id: "one", content: "one", target: targetResolver, title: "one" })
      .step({ id: "two", content: "two", target: targetResolver, title: "two" })
      .beforeEnter(() => {
        started.resolve();
        return hook.promise;
      })
      .build();
    await tour.start(workflow);
    const showCalls = driver.showCalls;

    const transition = tour.advance();
    await started.promise;
    await tour.cancel();
    hook.resolve();
    await transition;

    assert.equal(tour.state.get().status, "cancelled");
    assert.equal(driver.showCalls, showCalls);
  });

  test("does not finish a new workflow from a reentrant finished notification", async () => {
    let newWorkflowFinishes = 0;
    const tour = createGlowTour<string>();
    const oldWorkflow = tour.create("old-empty").build();
    const newWorkflow = tour
      .create("new-empty", {
        onFinish: () => {
          newWorkflowFinishes += 1;
        },
      })
      .build();
    let newRun: Promise<void> | null = null;
    tour.state.subscribe((state) => {
      if (state.name === "old-empty" && state.status === "finished") {
        newRun = tour.start(newWorkflow);
      }
    });

    await tour.start(oldWorkflow);
    await newRun;

    assert.equal(newWorkflowFinishes, 1);
    assert.equal(tour.state.get().name, "new-empty");
    assert.equal(tour.state.get().status, "finished");
  });

  test("does not run an old hook after reentrant dispose from transitioning", async () => {
    let oldHookCalls = 0;
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("dispose-reentrant")
      .step({ id: "step-92", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => {
        oldHookCalls += 1;
      })
      .build();
    await tour.start(workflow);
    tour.state.subscribe((state) => {
      if (state.status === "transitioning") tour.dispose();
    });

    await tour.advance();

    assert.equal(oldHookCalls, 0);
    assert.equal(driver.disposeCalls, 1);
  });

  test("does not run an old hook after reentrant run from transitioning", async () => {
    let oldHookCalls = 0;
    const tour = createGlowTour<string>();
    const oldWorkflow = tour
      .create("old")
      .step({ id: "step-93", content: "old", target: targetResolver, title: "old" })
      .beforeLeave(() => {
        oldHookCalls += 1;
      })
      .build();
    const newWorkflow = tour
      .create("new")
      .step({ id: "step-94", content: "new", target: targetResolver, title: "new" })
      .build();
    await tour.start(oldWorkflow);
    let newRun: Promise<void> | null = null;
    tour.state.subscribe((state) => {
      if (state.name === "old" && state.status === "transitioning") {
        newRun = tour.start(newWorkflow);
      }
    });

    await tour.advance();
    await newRun;

    assert.equal(oldHookCalls, 0);
    assert.equal(tour.state.get().name, "new");
    assert.equal(tour.state.get().status, "active");
  });

  test("does not run an old hook after reentrant cancel from transitioning", async () => {
    let oldHookCalls = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("cancel-reentrant")
      .step({ id: "step-95", content: "one", target: targetResolver, title: "one" })
      .beforeLeave(() => {
        oldHookCalls += 1;
      })
      .build();
    await tour.start(workflow);
    let cancellation: Promise<void> | null = null;
    tour.state.subscribe((state) => {
      if (state.status === "transitioning") cancellation = tour.cancel();
    });

    await tour.advance();
    await cancellation;

    assert.equal(oldHookCalls, 0);
    assert.equal(tour.state.get().status, "cancelled");
  });

  test("exposes previous only after the first step", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("previous-after-first")
      .step({ id: "step-96", content: "one", target: targetResolver, title: "one" })
      .step({ id: "step-97", content: "two", target: targetResolver, title: "two" })
      .build();
    await tour.start(workflow);
    assert.equal(tour.state.get().canPrevious, false);
    await tour.advance();
    assert.equal(tour.state.get().canPrevious, true);
  });

  test("removes the retry timer abort listener after resolving", async () => {
    let attempts = 0;
    const listenerCounts = { added: 0, removed: 0 };
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("retry-listener")
      .step({
        id: "step-98",
        behavior: { missingTarget: { strategy: "wait", timeout: 100 } },
        content: "one",
        target: ({ signal }) => {
          attempts += 1;
          if (attempts === 1) {
            trackAbortListeners(signal, listenerCounts);
            return null;
          }
          return target;
        },
        title: "one",
      })
      .build();

    await tour.start(workflow);

    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
  });

  test("removes the action delay abort listener after resolving", async () => {
    const listenerCounts = { added: 0, removed: 0 };
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("delay-listener")
      .step({
        id: "step-99",
        content: "one",
        target: ({ signal }) => {
          trackAbortListeners(signal, listenerCounts);
          return target;
        },
        title: "one",
      })
      .wait(0)
      .build();

    await tour.start(workflow);

    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
  });

  test("polls waitFor until its predicate succeeds", async () => {
    const tour = createGlowTour<string>();
    let attempts = 0;
    const workflow = tour
      .create("wait-condition")
      .step({ id: "step-100", content: "one", target: targetResolver, title: "one" })
      .waitUntil(
        ({ props }) => {
          assert.equal(props.get().title, "one");
          attempts += 1;
          return attempts === 3;
        },
        { interval: 1, timeout: 100 },
      )
      .build();

    await tour.start(workflow);

    assert.equal(attempts, 3);
    assert.equal(tour.state.get().status, "active");
  });

  test("polls waitForElement until the selector appears", async () => {
    let available = false;
    const target = {
      ownerDocument: { querySelector: () => (available ? target : null) },
    } as unknown as HTMLElement;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("wait-element")
      .step({ id: "step-101", content: "one", target: () => target, title: "one" })
      .waitUntilElement("#ready", { interval: 1, timeout: 100 })
      .build();

    setTimeout(() => {
      available = true;
    }, 2);
    await tour.start(workflow);
    assert.equal(tour.state.get().status, "active");
  });

  test("turns a wait timeout into a terminal public error and cleans the view", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("wait-timeout")
      .step({ id: "step-102", content: "one", target: targetResolver, title: "one" })
      .waitUntil(() => false, { interval: 1, timeout: 0 })
      .build();

    await assert.rejects(() => tour.start(workflow), /waitUntil timed out after 0ms/i);

    assert.equal(tour.state.get().status, "error");
    assert.equal(driver.clearCalls, 1);
  });

  test("bounds slow and never-resolving async wait predicates", async () => {
    for (const predicate of [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      },
      () => new Promise<boolean>(() => {}),
    ]) {
      const driver = new RecordingDriver();
      const tour = new TourController<string>(driver);
      const workflow = tour
        .create("async-wait-timeout")
        .step({ id: "step-103", content: "one", target: targetResolver, title: "one" })
        .waitUntil(predicate, { interval: 1, timeout: 1 })
        .build();

      await assert.rejects(() => tour.start(workflow), /waitUntil timed out after 1ms/i);
      assert.equal(tour.state.get().status, "error");
      assert.equal(driver.clearCalls, 1);
    }
  });

  test("aborts pending waits when a newer run supersedes them", async () => {
    const tour = createGlowTour<string>();
    let attempts = 0;
    const entered = deferred<void>();
    const waiting = tour.start(
      tour
        .create("waiting")
        .step({ id: "step-104", content: "one", target: targetResolver, title: "one" })
        .waitUntil(
          () => {
            attempts += 1;
            entered.resolve();
            return false;
          },
          { interval: 100, timeout: 1000 },
        )
        .build(),
    );
    await entered.promise;

    await tour.start(tour.create("replacement").build());
    await waiting;

    assert.equal(attempts, 1);
    assert.equal(tour.state.get().name, "replacement");
    assert.equal(tour.state.get().status, "finished");
  });

  test("aborts pending waits on cancel and dispose without late retries", async () => {
    const cancellable = createGlowTour<string>();
    let cancelAttempts = 0;
    const cancelEntered = deferred<void>();
    const cancelPredicate = deferred<boolean>();
    const cancelRun = cancellable.start(
      cancellable
        .create("cancel-wait")
        .step({ id: "step-105", content: "one", target: targetResolver, title: "one" })
        .waitUntil(
          () => {
            cancelAttempts += 1;
            cancelEntered.resolve();
            return cancelPredicate.promise;
          },
          { interval: 100, timeout: 1000 },
        )
        .build(),
    );
    await cancelEntered.promise;
    await cancellable.cancel();
    await cancelRun;
    cancelPredicate.resolve(true);
    await Promise.resolve();
    assert.equal(cancelAttempts, 1);
    assert.equal(cancellable.state.get().status, "cancelled");

    const driver = new RecordingDriver();
    const disposable = new TourController<string>(driver);
    let disposeAttempts = 0;
    const disposeEntered = deferred<void>();
    const disposeRun = disposable.start(
      disposable
        .create("dispose-wait")
        .step({ id: "step-106", content: "one", target: targetResolver, title: "one" })
        .waitUntil(
          () => {
            disposeAttempts += 1;
            disposeEntered.resolve();
            return false;
          },
          { interval: 100, timeout: 1000 },
        )
        .build(),
    );
    await disposeEntered.promise;
    disposable.dispose();
    await disposeRun;
    assert.equal(disposeAttempts, 1);
    assert.equal(driver.disposeCalls, 1);
    await assert.rejects(() => disposable.advance(), /disposed/i);
  });

  for (const failureSource of ["action", "hook", "view"] as const) {
    test(`rejects the original ${failureSource} error when an error subscriber runs a replacement`, async () => {
      const boom = new Error("boom");
      const driver = new RecordingDriver();
      const tour = new TourController<string>(driver);
      const step = tour
        .create(`failing-${failureSource}`)
        .step({ id: "step-107", content: "old", target: targetResolver, title: "old" });
      const failingWorkflow =
        failureSource === "action"
          ? step
              .do(() => {
                throw boom;
              })
              .build()
          : failureSource === "hook"
            ? step
                .beforeLeave(() => {
                  throw boom;
                })
                .build()
            : step.build();
      const replacement = tour
        .create(`replacement-${failureSource}`)
        .step({ id: "step-108", content: "new", target: targetResolver, title: "new" })
        .build();
      if (failureSource === "view") driver.showError = boom;
      let replacementRun: Promise<void> | null = null;
      tour.state.subscribe((state) => {
        if (state.name === `failing-${failureSource}` && state.status === "error") {
          driver.showError = null;
          replacementRun = tour.start(replacement);
        }
      });

      if (failureSource === "hook") await tour.start(failingWorkflow);
      const failingCommand =
        failureSource === "hook" ? tour.advance() : tour.start(failingWorkflow);

      await assert.rejects(failingCommand, (error) => error === boom);
      await replacementRun;

      assert.equal(driver.clearCalls, 0);
      assert.equal(tour.state.get().name, `replacement-${failureSource}`);
      assert.equal(tour.state.get().status, "active");
      assert.equal(tour.state.get().error, null);
    });
  }

  test("notifies a nested subscription once with the current published snapshot", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("nested-subscribe")
      .step({ id: "step-109", content: "one", target: targetResolver, title: "one" })
      .build();
    let nestedStartingNotifications = 0;
    let nestedSubscribed = false;
    let nestedUnsubscribe = () => {};
    const outerUnsubscribe = tour.state.subscribe((state) => {
      if (state.status === "starting" && !nestedSubscribed) {
        nestedSubscribed = true;
        nestedUnsubscribe = tour.state.subscribe((nestedState) => {
          if (nestedState.status === "starting") nestedStartingNotifications += 1;
        });
      }
    });

    await tour.start(workflow);

    assert.equal(nestedStartingNotifications, 1);
    outerUnsubscribe();
    nestedUnsubscribe();
  });

  test("stops an old publication when an earlier listener starts a replacement workflow", async () => {
    const tour = createGlowTour<string>();
    const oldWorkflow = tour
      .create("old-publication")
      .step({ id: "step-110", content: "old", target: targetResolver, title: "old" })
      .build();
    const replacement = tour
      .create("replacement-publication")
      .step({ id: "step-111", content: "new", target: targetResolver, title: "new" })
      .build();
    let replacementRun: Promise<void> | null = null;
    const firstUnsubscribe = tour.state.subscribe((state) => {
      if (state.name === "old-publication" && state.status === "finished") {
        replacementRun = tour.start(replacement);
      }
    });
    const secondNotifications: string[] = [];
    const secondUnsubscribe = tour.state.subscribe((state) => {
      if (
        (state.name === "replacement-publication" && state.status === "starting") ||
        (state.name === "old-publication" && state.status === "finished")
      ) {
        secondNotifications.push(`${state.name}:${state.status}`);
      }
    });

    await tour.start(oldWorkflow);
    await tour.advance();
    await replacementRun;

    assert.deepEqual(secondNotifications, ["replacement-publication:starting"]);
    firstUnsubscribe();
    secondUnsubscribe();
  });

  test("does not retain or notify a listener that disposes during its initial snapshot", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    let notifications = 0;
    const unsubscribe = tour.state.subscribe(() => {
      notifications += 1;
      tour.dispose();
    });

    tour.dispose();
    let disposedSubscriptionCalls = 0;
    tour.state.subscribe(() => {
      disposedSubscriptionCalls += 1;
    });
    unsubscribe();

    assert.equal(notifications, 1);
    assert.equal(disposedSubscriptionCalls, 0);
    assert.equal(driver.disposeCalls, 1);
  });

  test("isolates state listener failures during initial and run publications", async () => {
    const errors: Error[] = [];
    const healthyListenerStatuses: string[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });
    const workflow = tour
      .create("state-listeners")
      .step({ id: "step-112", content: "one", target: targetResolver, title: "one" })
      .build();
    tour.state.subscribe(() => {
      throw "state subscriber failure";
    });
    tour.state.subscribe((state) => {
      healthyListenerStatuses.push(state.status);
    });

    await tour.start(workflow);

    assert.equal(tour.state.get().status, "active");
    assert.equal(healthyListenerStatuses.at(-1), "active");
    assert.ok(healthyListenerStatuses.includes("starting"));
    assert.ok(errors.length >= 2);
    assert.ok(errors.every((error) => error instanceof Error));
    assert.ok(errors.every((error) => error.message === "state subscriber failure"));
  });

  test("isolates props listener failures during actions", async () => {
    const errors: Error[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });
    const workflow = tour
      .create("props-listeners")
      .step({ id: "step-113", content: "one", target: targetResolver, title: "one" })
      .do(({ props }) => {
        props.subscribe(() => {
          throw "props subscriber failure";
        });
        props.set((current) => ({ ...current, content: "updated" }));
      })
      .build();

    await tour.start(workflow);

    assert.equal(tour.state.get().status, "active");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "updated");
    assert.equal(errors.length, 2);
    assert.ok(errors.every((error) => error.message === "props subscriber failure"));
  });

  test("normalizes subscriber failures whose string coercion throws", () => {
    const errors: Error[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });
    const uncoercible = {
      toString() {
        throw new Error("cannot stringify");
      },
    };

    tour.state.subscribe(() => {
      throw uncoercible;
    });

    assert.equal(errors.length, 1);
    assert.equal(errors[0]?.message, "Unknown error");
  });

  test("routes subscriber failures to the injected unhandled reporter when no hook is configured", async () => {
    const unhandled: Error[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      reportUnhandledError: (error) => {
        unhandled.push(error);
      },
    });

    tour.state.subscribe(() => {
      throw "subscriber failure";
    });
    await flushMicrotasks();

    assert.deepEqual(
      unhandled.map((error) => error.message),
      ["subscriber failure"],
    );
  });

  test("forwards public onSubscriberError to the controller without mounting", () => {
    const errors: Error[] = [];
    const tour = createPublicGlowTour<string>({
      onSubscriberError: (error) => {
        errors.push(error);
      },
    });

    tour.state.subscribe(() => {
      throw new Error("public subscriber failure");
    });
    tour.dispose();

    assert.deepEqual(
      errors.map((error) => error.message),
      ["public subscriber failure", "public subscriber failure"],
    );
  });

  test("the public createGlowTour facade forwards run options to the controller", async () => {
    // Regression: the facade used to declare `start: (workflow) => ...`, silently
    // dropping `startAt`. TypeScript accepts the narrower signature, and every
    // test that drives TourController directly stays green, so only a run
    // through the public entry point catches it.
    const tour = createPublicGlowTour<string>();
    const workflow = tour
      .create("public-facade")
      .step({ id: "first", content: "one", target: targetResolver, title: "one" })
      .step({ id: "second", content: "two", target: targetResolver, title: "two" })
      .build();

    await assert.rejects(() => tour.start(workflow, { startAt: "nope" }), {
      message: 'Workflow "public-facade" has no step with id "nope".',
    });
  });

  test("sends sync and async subscriber error hook failures to the unhandled reporter", async () => {
    const unhandled: Error[] = [];
    const sync = new TourController<string>(new NoopTourViewDriver(), {
      onSubscriberError: () => {
        throw new Error("sync hook failure");
      },
      reportUnhandledError: (error) => {
        unhandled.push(error);
      },
    });
    sync.state.subscribe(() => {
      throw new Error("subscriber failure");
    });

    const asynchronous = new TourController<string>(new NoopTourViewDriver(), {
      onSubscriberError: async () => {
        throw new Error("async hook failure");
      },
      reportUnhandledError: (error) => {
        unhandled.push(error);
      },
    });
    asynchronous.state.subscribe(() => {
      throw new Error("subscriber failure");
    });
    await flushMicrotasks();

    assert.deepEqual(unhandled.map((error) => error.message).sort(), [
      "async hook failure",
      "sync hook failure",
    ]);
  });
});

describe("step classNames", () => {
  test("overrides the workflow classes per component and lets the step update them", async () => {
    const tour = createGlowTour<string>();
    let context: StepContext<string> | undefined;
    const workflow = tour
      .create("class-names", { classNames: { popover: "tour", header: "tour-header" } })
      .step({
        id: "first",
        content: "content",
        target: targetResolver,
        classNames: { popover: "first" },
      })
      .do((stepContext) => {
        context = stepContext;
      })
      .step({ id: "second", content: "content", target: targetResolver })
      .build();

    await tour.start(workflow);
    assert.deepEqual(tour.state.get().currentStep?.currentProps.classNames, {
      popover: "first",
      header: "tour-header",
    });

    context?.props.update({ classNames: { popover: "highlighted" } });
    assert.deepEqual(tour.state.get().currentStep?.currentProps.classNames, {
      popover: "highlighted",
      header: "tour-header",
    });

    await tour.advance();
    assert.deepEqual(tour.state.get().currentStep?.currentProps.classNames, {
      popover: "tour",
      header: "tour-header",
    });
    await tour.dispose();
  });
});

describe("step ids and startAt", () => {
  function threeSteps() {
    return createGlowTour<string>();
  }

  function workflowOf(tour: ReturnType<typeof threeSteps>) {
    return tour
      .create("onboarding")
      .step({ id: "welcome", content: "one", target: targetResolver, title: "one" })
      .step({ id: "invite", content: "two", target: targetResolver, title: "two" })
      .step({ id: "done", content: "three", target: targetResolver, title: "three" })
      .build();
  }

  test("exposes the declared step id on the current step", async () => {
    const tour = threeSteps();

    await tour.start(workflowOf(tour));

    assert.equal(tour.state.get().currentStep?.id, "welcome");
  });

  test("starts on the step carrying the requested id", async () => {
    const tour = threeSteps();

    await tour.start(workflowOf(tour), { startAt: "invite" });

    assert.equal(tour.state.get().currentStep?.id, "invite");
    assert.equal(tour.state.get().currentStepIndex, 1);
  });

  test("keeps the workflow whole when resuming: totalSteps is unchanged and previous() goes back before the resume point", async () => {
    const tour = threeSteps();

    await tour.start(workflowOf(tour), { startAt: "invite" });
    assert.equal(tour.state.get().totalSteps, 3);
    assert.equal(tour.state.get().isFirstStep, false);

    await tour.previous();

    assert.equal(tour.state.get().currentStep?.id, "welcome");
    assert.equal(tour.state.get().isFirstStep, true);
  });

  test("passes the resumed step, not the first one, to onStart", async () => {
    const tour = createGlowTour<string>();
    const seen: (string | null)[] = [];
    const workflow = tour
      .create("onboarding", {
        onStart: ({ step }) => {
          seen.push(step?.id ?? null);
        },
      })
      .step({ id: "welcome", content: "one", target: targetResolver, title: "one" })
      .step({ id: "invite", content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.start(workflow, { startAt: "invite" });

    assert.deepEqual(seen, ["invite"]);
  });

  test("throws on an unknown startAt rather than silently restarting from the beginning", async () => {
    const tour = threeSteps();
    const workflow = workflowOf(tour);

    await assert.rejects(() => tour.start(workflow, { startAt: "removed-step" }), {
      message: 'Workflow "onboarding" has no step with id "removed-step".',
    });
    assert.equal(tour.state.get().status, "idle");
  });

  test("starts at the first step when startAt is omitted", async () => {
    const tour = threeSteps();

    await tour.start(workflowOf(tour), {});

    assert.equal(tour.state.get().currentStepIndex, 0);
  });

  test("rejects a workflow whose steps reuse an id", () => {
    const tour = createGlowTour<string>();
    const builder = tour
      .create("duplicates")
      .step({ id: "same", content: "one", target: targetResolver, title: "one" })
      .step({ id: "same", content: "two", target: targetResolver, title: "two" });

    assert.throws(() => builder.build(), {
      message:
        'Workflow "duplicates": step 1 ("two") reuses the id "same" already used by step 0. Step ids must be unique.',
    });
  });

  test("rejects a workflow with an empty step id", () => {
    const tour = createGlowTour<string>();
    const builder = tour
      .create("blank")
      .step({ id: "", content: "one", target: targetResolver, title: "one" });

    assert.throws(() => builder.build(), {
      message: 'Workflow "blank": step 0 ("one") is missing a non-empty "id".',
    });
  });

  test("keeps the id out of step props so it cannot be mutated mid-tour", async () => {
    const tour = threeSteps();

    await tour.start(workflowOf(tour));

    const step = tour.state.get().currentStep;
    assert.ok(step);
    assert.equal("id" in step.currentProps, false);
    assert.equal("id" in step.initialProps, false);
  });
});

describe("monitoring events", () => {
  function recorder() {
    const events: TourEvent[] = [];
    return { events, onEvent: (event: TourEvent) => events.push(event) };
  }

  function workflowOf(
    tour: TourController<string>,
    options: Parameters<TourController<string>["create"]>[1] = {},
  ) {
    return tour
      .create("onboarding", options)
      .step({ id: "welcome", content: "one", target: targetResolver, title: "one" })
      .step({ id: "invite", content: "two", target: targetResolver, title: "two" })
      .build();
  }

  test("emits the full sequence of a completed tour, in order", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.advance();
    await tour.advance();

    assert.deepEqual(
      events.map((event) => `${event.type}:${event.stepId ?? "-"}`),
      [
        "tour:start:welcome",
        "step:enter:welcome",
        "step:leave:welcome",
        "step:enter:invite",
        "step:leave:invite",
        "tour:complete:invite",
      ],
    );
  });

  test("emits step:skip for each skipped step, then a single step:leave, in both directions", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });
    const skip = { missingTarget: { strategy: "skip" } } as const;
    const workflow = tour
      .create("skips")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .step({ id: "gone", behavior: skip, content: "2", target: () => null, title: "2" })
      .step({ id: "also-gone", behavior: skip, content: "3", target: () => null, title: "3" })
      .step({ id: "last", content: "4", target: targetResolver, title: "4" })
      .build();

    await tour.start(workflow);
    await tour.advance();
    await tour.previous();

    assert.deepEqual(
      events.map((event) => `${event.type}:${event.stepId}:${event.direction}`),
      [
        "tour:start:first:advance",
        "step:enter:first:advance",
        "step:skip:gone:advance",
        "step:skip:also-gone:advance",
        "step:leave:first:advance",
        "step:enter:last:advance",
        "step:skip:also-gone:previous",
        "step:skip:gone:previous",
        "step:leave:last:previous",
        "step:enter:first:previous",
      ],
    );
    const skips = events.filter((event) => event.type === "step:skip");
    assert.deepEqual(
      skips.map((event) => [event.stepIndex, event.durationMs]),
      [
        [1, 0],
        [2, 0],
        [2, 0],
        [1, 0],
      ],
    );
  });

  test("reports the navigation that finishes the tour past skipped steps, not the previous one", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });
    let lastPresent = true;
    const workflow = tour
      .create("skip-to-finish")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .step({
        id: "last",
        behavior: { missingTarget: { strategy: "skip" } },
        content: "2",
        target: () => (lastPresent ? targetResolver() : null),
        title: "2",
      })
      .build();

    await tour.start(workflow);
    await tour.advance();
    await tour.previous();
    lastPresent = false;
    events.length = 0;
    await tour.advance();

    assert.deepEqual(
      events.map((event) => `${event.type}:${event.stepId}:${event.direction}`),
      ["step:skip:last:advance", "step:leave:first:advance", "tour:complete:first:advance"],
    );
  });

  test("emits nothing and returns to idle when beforeEnter aborts the first step", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });
    const workflow = tour
      .create("aborted-start")
      .step({ id: "first", content: "1", target: targetResolver, title: "1" })
      .beforeEnter(({ abort }) => abort())
      .build();

    await tour.start(workflow);

    assert.deepEqual(events, []);
    assert.equal(tour.state.get().status, "idle");
    assert.equal(tour.state.get().currentStep, null);
  });

  test("emits tour:cancel after leaving the step the user was on", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.cancel();

    assert.deepEqual(
      events.map((event) => event.type),
      ["tour:start", "step:enter", "step:leave", "tour:cancel"],
    );
    assert.equal(events.at(-1)?.stepId, "welcome");
  });

  test("carries the workflow name, the step position and the step count", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.advance();

    const entered = events.filter((event) => event.type === "step:enter");
    assert.deepEqual(
      entered.map((event) => [event.workflowName, event.stepIndex, event.stepCount]),
      [
        ["onboarding", 0, 2],
        ["onboarding", 1, 2],
      ],
    );
  });

  test("reports the direction of the navigation that led to the step", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.advance();
    await tour.previous();

    const entered = events.filter((event) => event.type === "step:enter");
    assert.deepEqual(
      entered.map((event) => [event.stepId, event.direction]),
      [
        ["welcome", "advance"],
        ["invite", "advance"],
        ["welcome", "previous"],
      ],
    );

    // A leave reports the navigation that causes it, not the one that brought
    // the user onto the step.
    const left = events.filter((event) => event.type === "step:leave");
    assert.deepEqual(
      left.map((event) => [event.stepId, event.direction]),
      [
        ["welcome", "advance"],
        ["invite", "previous"],
      ],
    );
  });

  test("reports what triggered the transition", async () => {
    const { events, onEvent } = recorder();
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver, { onEvent });

    await tour.start(workflowOf(tour));
    await driver.commands?.advance("keyboard");

    assert.equal(events.find((event) => event.type === "step:leave")?.source, "keyboard");
    assert.equal(events.at(-1)?.source, "keyboard");
  });

  test("defaults the source to api for calls made by the consumer's own code", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.advance();

    assert.ok(events.every((event) => event.source === "api"));
  });

  test("times the step on step:leave and the whole tour on the terminal event", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour));
    await tour.advance();
    await tour.advance();

    for (const event of events) {
      if (event.type === "tour:start" || event.type === "step:enter") {
        assert.equal(event.durationMs, 0, `${event.type} should report no duration`);
      } else {
        assert.ok(event.durationMs >= 0, `${event.type} should report a duration`);
      }
    }
  });

  test("names the step the tour died on, and carries the error", async () => {
    const { events, onEvent } = recorder();
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver, { onEvent });
    const workflow = workflowOf(tour);

    await tour.start(workflow);
    driver.clearError = null;
    driver.showError = new Error("boom");
    await assert.rejects(() => tour.advance());

    const failure = events.at(-1);
    assert.equal(failure?.type, "tour:error");
    assert.equal(failure?.error?.message, "boom");
    // The step it died on, not the one it was leaving.
    assert.equal(failure?.stepId, "welcome");
  });

  test("emits no step:leave when the tour errors, since the step was never left", async () => {
    const { events, onEvent } = recorder();
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver, { onEvent });

    await tour.start(workflowOf(tour));
    events.length = 0;
    driver.showError = new Error("boom");
    await assert.rejects(() => tour.advance());

    assert.deepEqual(
      events.map((event) => event.type),
      ["step:leave", "tour:error"],
    );
  });

  test("calls the instance listener before the workflow listener", async () => {
    const order: string[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: () => order.push("instance"),
    });

    await tour.start(workflowOf(tour, { onEvent: () => order.push("workflow") }));

    assert.deepEqual(order.slice(0, 2), ["instance", "workflow"]);
  });

  test("a throwing listener neither breaks the tour nor reaches its error state", async () => {
    const reported: Error[] = [];
    const tour = new TourController<string>(new NoopTourViewDriver(), {
      onEvent: () => {
        throw new Error("listener exploded");
      },
      onSubscriberError: (error) => {
        reported.push(error);
      },
    });

    await tour.start(workflowOf(tour));
    await tour.advance();
    await tour.advance();

    assert.equal(tour.state.get().status, "finished");
    assert.equal(tour.state.get().error, null);
    assert.ok(reported.length > 0);
    assert.equal(reported[0]?.message, "listener exploded");
  });

  test("emits nothing when no listener is attached", async () => {
    const tour = new TourController<string>(new NoopTourViewDriver());

    await tour.start(workflowOf(tour));
    await tour.advance();
    await tour.advance();

    assert.equal(tour.state.get().status, "finished");
  });

  test("reports the resumed step on tour:start, so a resume needs no event of its own", async () => {
    const { events, onEvent } = recorder();
    const tour = new TourController<string>(new NoopTourViewDriver(), { onEvent });

    await tour.start(workflowOf(tour), { startAt: "invite" });

    assert.deepEqual(
      events.map((event) => `${event.type}:${event.stepId}`),
      ["tour:start:invite", "step:enter:invite"],
    );
    assert.equal(events[0]?.stepIndex, 1);
  });
});
