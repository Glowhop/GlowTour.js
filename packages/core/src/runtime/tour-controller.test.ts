import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { TourViewCommands, TourViewDriver } from "../dom/tour-view-driver";
import type { StepContext } from "../types";
import type { ActiveStep } from "./active-step";
import { TourController } from "./tour-controller";

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

function createGlowTour<T>() {
  return new TourController<T>();
}

class RecordingDriver implements TourViewDriver<string> {
  clearCalls = 0;
  commands: TourViewCommands | null = null;
  disposeCalls = 0;
  showCalls = 0;
  showError: Error | null = null;

  clear() {
    this.clearCalls += 1;
  }

  dispose() {
    this.disposeCalls += 1;
  }

  show(_step: ActiveStep<string>) {
    this.showCalls += 1;
    if (this.showError) throw this.showError;
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

describe("instance-first TourController", () => {
  test("passes the workflow to assertCanRun before lifecycle state changes", async () => {
    let onStartCalls = 0;
    const tour = new TourController<string>(undefined, {
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(() => tour.run(workflow), /presentation unavailable/);

    assert.equal(onStartCalls, 0);
    assert.equal(tour.state.get().status, "idle");
    assert.equal(tour.state.get().error, null);
  });

  test("does not expose the removed updateCurrentStep command", () => {
    const tour = new TourController<string>();

    assert.equal("updateCurrentStep" in tour, false);
  });

  test("builds frozen plain definitions and isolates mutable step data per run", async () => {
    const tour = createGlowTour<string>();
    let activeProps!: StepContext<string>["props"];
    const workflow = tour
      .create("readonly", {
        cancellable: true,
        popover: { arrow: { color: "#4c35fd" }, keyboardShortcuts: { advance: ["Enter"] } },
      })
      .step({
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
    assert.equal(Object.isFrozen(workflow.options.popover?.keyboardShortcuts?.advance), true);
    assert.equal(Object.isFrozen(workflow.options.popover?.arrow), true);
    assert.equal(Object.isFrozen(workflow.steps[0].overlay?.animation), true);
    assert.equal("clone" in workflow.steps[0], false);

    await tour.run(workflow);
    assert.equal(Object.isFrozen(tour.state.get().currentStep), true);
    assert.equal(Object.isFrozen(tour.state.get().currentStep?.currentProps.data), true);
    activeProps.set((props) => ({ ...props, data: { count: 2 } }));
    assert.deepEqual(tour.state.get().currentStep?.currentProps.data, { count: 2 });
    assert.deepEqual(workflow.steps[0].props.data, { count: 1 });

    await tour.run(workflow);
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
    await tour.run(
      tour
        .create("frozen-facade")
        .step({ content: "one", target: targetResolver, title: "one" })
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();

    await tour.run(workflow);
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
      navigate: (tour: TourController<string>) => tour.goToStep(2),
      name: "goToStep",
      start: 0,
    },
  ] as const) {
    test(`publishes ${scenario.name} content before the popover fade-in`, async () => {
      const driver = new StagedTransitionDriver();
      const tour = new TourController<string>(driver);
      const workflow = tour
        .create(`staged-${scenario.name}`)
        .step({ content: "zero", target: targetResolver, title: "zero" })
        .step({ content: "one", target: targetResolver, title: "one" })
        .step({ content: "two", target: targetResolver, title: "two" })
        .build();
      await tour.run(workflow);
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
      .create("staged-capabilities", { cancellable: true })
      .step({ content: "zero", target: targetResolver, title: "zero" })
      .step({
        content: "one",
        disableAdvanceButton: true,
        target: targetResolver,
        title: "one",
      })
      .build();
    await tour.run(workflow);
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
      { canAdvance: true, canCancel: true, canPrevious: false },
    );

    await driver.commitContent();
    assert.equal(tour.state.get().status, "transitioning");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: true, canPrevious: true },
    );

    driver.finishShow();
    await navigation;
  });

  test("keeps the active workflow presentation until its replacement commits", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const active = tour
      .create("active", { cancellable: true })
      .step({ content: "active", target: targetResolver, title: "active" })
      .build();
    const replacement = tour
      .create("replacement", { cancellable: false })
      .step({
        content: "replacement",
        disableAdvanceButton: true,
        target: targetResolver,
        title: "replacement",
      })
      .build();
    await tour.run(active);
    driver.pauseAdvanceShow();

    const replacing = tour.run(replacement);
    await flushMicrotasks();
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "active");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: true, canCancel: true, canPrevious: false },
    );

    await driver.commitContent();
    assert.equal(tour.state.get().currentStep?.currentProps.content, "replacement");
    assert.deepEqual(
      {
        canAdvance: tour.state.get().canAdvance,
        canCancel: tour.state.get().canCancel,
        canPrevious: tour.state.get().canPrevious,
      },
      { canAdvance: false, canCancel: false, canPrevious: false },
    );

    driver.finishShow();
    await replacing;
  });

  test("keeps the committed presentation through a reentrant starting replacement", async () => {
    const driver = new StagedTransitionDriver();
    const tour = new TourController<string>(driver);
    const active = tour
      .create("active")
      .step({ content: "active", target: targetResolver, title: "active" })
      .build();
    const finalWorkflow = tour
      .create("final")
      .step({ content: "final", target: targetResolver, title: "final" })
      .build();
    let finalRun: Promise<void> | null = null;
    const replacedDuringStart = tour
      .create("replaced-during-start", {
        onStart: () => {
          finalRun = tour.run(finalWorkflow);
        },
      })
      .step({ content: "stale", target: targetResolver, title: "stale" })
      .build();
    await tour.run(active);
    driver.pauseAdvanceShow();

    const replacedRun = tour.run(replacedDuringStart);
    await flushMicrotasks();
    assert.equal(tour.state.get().name, "final");
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStep?.currentProps.content, "active");
    assert.equal(tour.state.get().canAdvance, true);

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
      .create("cancel-staged-content", { cancellable: true })
      .step({ content: "old", target: targetResolver, title: "old" })
      .step({ content: "stale", target: targetResolver, title: "stale" })
      .build();
    await tour.run(workflow);
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

  test("keeps previous blocked on the first step independently from cancellation", async () => {
    const cancellable = createGlowTour<string>();
    const allowed = cancellable
      .create("allowed", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await cancellable.run(allowed);
    await cancellable.previous();
    assert.equal(cancellable.state.get().status, "active");

    const nonCancellable = createGlowTour<string>();
    const denied = nonCancellable
      .create("denied", { cancellable: false })
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await nonCancellable.run(denied);
    await nonCancellable.previous();
    assert.equal(nonCancellable.state.get().status, "active");
  });

  test("awaits a transition hook exactly once and exposes rejected hooks as errors", async () => {
    let calls = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("hooks")
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(async () => {
        calls += 1;
      })
      .build();
    await tour.run(workflow);
    await tour.advance();
    assert.equal(calls, 1);

    const failingTour = createGlowTour<string>();
    const failing = failingTour
      .create("failing-hook")
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => {
        throw new TypeError("hook failed");
      })
      .build();
    await failingTour.run(failing);
    await assert.rejects(() => failingTour.advance(), /hook failed/);
    assert.equal(failingTour.state.get().status, "error");
    assert.equal(failingTour.state.get().error?.message, "hook failed");
  });

  test("ignores a second advance while the first transition is pending", async () => {
    const gate = deferred<void>();
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("concurrent")
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => gate.promise)
      .build();
    await tour.run(workflow);
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
      .step({ content: "current", target: targetResolver, title: "current" })
      .build();

    const oldRun = tour.run(oldWorkflow);
    await resolverStarted.promise;
    await tour.run(current);
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
    const run = cancelTour.run(waiting);
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
    const pending = disposeTour.run(disposable);
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
      .create("abort-wait", { cancellable: true })
      .step({
        behavior: { missingTargetStrategy: "wait", targetTimeout: 60_000 },
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

    const run = tour.run(workflow);
    await firstAttempt.promise;
    await timerListenerAdded.promise;
    await tour.cancel();
    await run;

    assert.equal(attempts, 1);
    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
    assert.equal(tour.state.get().status, "cancelled");
  });

  test("resolves selector, sync and async targets and applies error, skip, and wait strategies", async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { querySelector: (selector: string) => (selector === "#found" ? target : null) },
    });

    try {
      const selectorTour = createGlowTour<string>();
      await selectorTour.run(
        selectorTour
          .create("selector")
          .step({ content: "one", target: "#found", title: "one" })
          .build(),
      );
      assert.equal(selectorTour.state.get().currentStep?.target, target);

      const syncTour = createGlowTour<string>();
      await syncTour.run(
        syncTour
          .create("sync")
          .step({ content: "one", target: () => target, title: "one" })
          .build(),
      );
      assert.equal(syncTour.state.get().status, "active");

      const asyncTour = createGlowTour<string>();
      await asyncTour.run(
        asyncTour
          .create("async")
          .step({ content: "one", target: async () => target, title: "one" })
          .build(),
      );
      assert.equal(asyncTour.state.get().status, "active");

      const errorTour = createGlowTour<string>();
      await assert.rejects(
        () =>
          errorTour.run(
            errorTour
              .create("error")
              .step({ content: "one", target: () => null, title: "one" })
              .build(),
          ),
        /Missing target/,
      );
      assert.equal(errorTour.state.get().status, "error");

      const skipTour = createGlowTour<string>();
      await skipTour.run(
        skipTour
          .create("skip")
          .step({
            behavior: { missingTargetStrategy: "skip" },
            content: "one",
            target: () => null,
            title: "one",
          })
          .step({ content: "two", target: targetResolver, title: "two" })
          .build(),
      );
      assert.equal(skipTour.state.get().currentStepIndex, 1);

      let attempts = 0;
      const waitTour = createGlowTour<string>();
      await waitTour.run(
        waitTour
          .create("wait")
          .step({
            behavior: { missingTargetStrategy: "wait", targetTimeout: 100 },
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
      .step({ content: "one", data: { value: 1 }, target: targetResolver, title: "one" })
      .do(({ props }) => {
        activeProps = props;
      })
      .build();
    await tour.run(workflow);
    activeProps.set((props) => ({ ...props, data: { value: 2 }, title: "two" }));
    assert.equal(tour.state.get().currentStep?.currentProps.title, "two");
    assert.deepEqual(workflow.steps[0].props.data, { value: 1 });
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
    await tour.run(workflow);
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .do(async ({ props }) => {
        assert.equal(typeof props.set, "function");
        calls.push(String(props.get().title));
        props.set((current) => ({ ...current, title: "updated" }));
        return true;
      })
      .do(({ advance }) => advance())
      .step({ content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.run(workflow);

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
        .create(`context-${command}`, { cancellable: true })
        .step({ content: "one", target: targetResolver, title: "one" });
      if (command === "previous") {
        actionStep = actionStep.step({ content: "two", target: targetResolver, title: "two" });
      }
      const workflow = actionStep
        .do((context) => context[command]())
        .do(() => {
          calls.push("stale");
        })
        .step({ content: "three", target: targetResolver, title: "three" })
        .build();

      if (command === "previous") {
        await tour.run(workflow);
        await tour.advance();
      } else {
        await tour.run(workflow);
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .do(() => {
        throw new TypeError("action failed");
      })
      .build();

    await assert.rejects(() => tour.run(workflow), /action failed/);
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await tour.run(workflow);

    assert.ok(driver.commands);
    await driver.commands?.reportError(new TypeError("event failed"));

    assert.equal(tour.state.get().status, "error");
    assert.equal(tour.state.get().error?.message, "event failed");
    assert.equal(driver.clearCalls, 1);
  });

  test("honors disabled navigation props in state and commands", async () => {
    const tour = createGlowTour<string>();
    let firstStepProps!: StepContext<string>["props"];
    const workflow = tour
      .create("disabled-navigation")
      .step({
        content: "one",
        disableAdvanceButton: true,
        target: targetResolver,
        title: "one",
      })
      .do(({ props }) => {
        firstStepProps = props;
      })
      .step({
        content: "two",
        disablePreviousButton: true,
        target: targetResolver,
        title: "two",
      })
      .build();

    await tour.run(workflow);
    assert.equal(tour.state.get().canAdvance, false);
    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 0);

    firstStepProps.set((props) => ({ ...props, disableAdvanceButton: false }));
    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().canPrevious, false);
    await tour.previous();
    assert.equal(tour.state.get().currentStepIndex, 1);
  });

  test("awaits the directional hook before goToStep navigation", async () => {
    const hook = deferred<void>();
    let calls = 0;
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("go-to-hook")
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => {
        calls += 1;
        return hook.promise;
      })
      .step({ content: "two", target: targetResolver, title: "two" })
      .build();
    await tour.run(workflow);

    const navigation = tour.goToStep(1);
    assert.equal(tour.state.get().status, "transitioning");
    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(calls, 1);
    await tour.goToStep(99);
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();

    await assert.rejects(() => tour.run(workflow), /view failed/);
    assert.equal(tour.state.get().status, "error");
    assert.equal(driver.showCalls, 1);
    assert.equal(driver.clearCalls, 1);
  });

  test("disposes the driver and subscriptions exactly once and rejects commands", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    let notifications = 0;
    tour.state.subscribe(() => {
      notifications += 1;
    });
    const workflow = tour
      .create("dispose")
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await tour.run(workflow);
    const notificationsBeforeDispose = notifications;

    tour.dispose();
    tour.dispose();

    assert.equal(driver.disposeCalls, 1);
    assert.equal(notifications, notificationsBeforeDispose);
    await assert.rejects(() => tour.run(workflow), /disposed/);
    await assert.rejects(() => tour.advance(), /disposed/);
    await assert.rejects(() => tour.previous(), /disposed/);
    await assert.rejects(() => tour.goToStep(0), /disposed/);
    await assert.rejects(() => tour.cancel(), /disposed/);
  });

  test("skips missing targets in the active navigation direction", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("reverse-skip")
      .step({ content: "zero", target: targetResolver, title: "zero" })
      .step({
        behavior: { missingTargetStrategy: "skip" },
        content: "one",
        target: () => null,
        title: "one",
      })
      .step({ content: "two", target: targetResolver, title: "two" })
      .build();

    await tour.run(workflow);
    await tour.goToStep(2);
    await tour.previous();

    assert.equal(tour.state.get().currentStepIndex, 0);
    assert.equal(tour.state.get().direction, "previous");
  });

  test("treats an unexpected resolver AbortError as terminal", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("unexpected-abort")
      .step({
        content: "one",
        target: () => {
          throw new DOMException("resolver aborted itself", "AbortError");
        },
        title: "one",
      })
      .build();

    await assert.rejects(() => tour.run(workflow), /resolver aborted itself/);
    assert.equal(tour.state.get().status, "error");
  });

  test("cancel invalidates a pending transition without stale state changes", async () => {
    const hook = deferred<void>();
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("cancel-transition", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => hook.promise)
      .step({ content: "two", target: targetResolver, title: "two" })
      .build();
    await tour.run(workflow);

    const transition = tour.advance();
    await tour.cancel();
    hook.resolve();
    await transition;

    assert.equal(tour.state.get().status, "cancelled");
    assert.equal(tour.state.get().currentStepIndex, 0);
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
        newRun = tour.run(newWorkflow);
      }
    });

    await tour.run(oldWorkflow);
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
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => {
        oldHookCalls += 1;
      })
      .build();
    await tour.run(workflow);
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
      .step({ content: "old", target: targetResolver, title: "old" })
      .beforeAdvance(() => {
        oldHookCalls += 1;
      })
      .build();
    const newWorkflow = tour
      .create("new")
      .step({ content: "new", target: targetResolver, title: "new" })
      .build();
    await tour.run(oldWorkflow);
    let newRun: Promise<void> | null = null;
    tour.state.subscribe((state) => {
      if (state.name === "old" && state.status === "transitioning") {
        newRun = tour.run(newWorkflow);
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
      .create("cancel-reentrant", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .beforeAdvance(() => {
        oldHookCalls += 1;
      })
      .build();
    await tour.run(workflow);
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
    const cancellableTour = createGlowTour<string>();
    const cancellable = cancellableTour
      .create("cancellable", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await cancellableTour.run(cancellable);
    assert.equal(cancellableTour.state.get().canPrevious, false);

    const fixedTour = createGlowTour<string>();
    const fixed = fixedTour
      .create("fixed", { cancellable: false })
      .step({ content: "one", target: targetResolver, title: "one" })
      .build();
    await fixedTour.run(fixed);
    assert.equal(fixedTour.state.get().canPrevious, false);
  });

  test("removes the retry timer abort listener after resolving", async () => {
    let attempts = 0;
    const listenerCounts = { added: 0, removed: 0 };
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("retry-listener")
      .step({
        behavior: { missingTargetStrategy: "wait", targetTimeout: 100 },
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

    await tour.run(workflow);

    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
  });

  test("removes the action delay abort listener after resolving", async () => {
    const listenerCounts = { added: 0, removed: 0 };
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("delay-listener")
      .step({
        content: "one",
        target: ({ signal }) => {
          trackAbortListeners(signal, listenerCounts);
          return target;
        },
        title: "one",
      })
      .wait(0)
      .build();

    await tour.run(workflow);

    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
  });

  test("polls waitFor until its predicate succeeds", async () => {
    const tour = createGlowTour<string>();
    let attempts = 0;
    const workflow = tour
      .create("wait-condition")
      .step({ content: "one", target: targetResolver, title: "one" })
      .waitUntil(
        ({ props }) => {
          assert.equal(props.get().title, "one");
          attempts += 1;
          return attempts === 3;
        },
        { interval: 1, timeout: 100 },
      )
      .build();

    await tour.run(workflow);

    assert.equal(attempts, 3);
    assert.equal(tour.state.get().status, "active");
  });

  test("polls waitForElement until the selector appears", async () => {
    const originalDocument = globalThis.document;
    let available = false;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { querySelector: () => (available ? target : null) },
    });
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("wait-element")
      .step({ content: "one", target: targetResolver, title: "one" })
      .waitUntilElement("#ready", { interval: 1, timeout: 100 })
      .build();

    try {
      setTimeout(() => {
        available = true;
      }, 2);
      await tour.run(workflow);
      assert.equal(tour.state.get().status, "active");
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  test("turns a wait timeout into a terminal public error and cleans the view", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("wait-timeout")
      .step({ content: "one", target: targetResolver, title: "one" })
      .waitUntil(() => false, { interval: 1, timeout: 0 })
      .build();

    await assert.rejects(() => tour.run(workflow), /waitUntil timed out after 0ms/i);

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
        .step({ content: "one", target: targetResolver, title: "one" })
        .waitUntil(predicate, { interval: 1, timeout: 1 })
        .build();

      await assert.rejects(() => tour.run(workflow), /waitUntil timed out after 1ms/i);
      assert.equal(tour.state.get().status, "error");
      assert.equal(driver.clearCalls, 1);
    }
  });

  test("aborts pending waits when a newer run supersedes them", async () => {
    const tour = createGlowTour<string>();
    let attempts = 0;
    const entered = deferred<void>();
    const waiting = tour.run(
      tour
        .create("waiting")
        .step({ content: "one", target: targetResolver, title: "one" })
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

    await tour.run(tour.create("replacement").build());
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
    const cancelRun = cancellable.run(
      cancellable
        .create("cancel-wait", { cancellable: true })
        .step({ content: "one", target: targetResolver, title: "one" })
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
    const disposeRun = disposable.run(
      disposable
        .create("dispose-wait")
        .step({ content: "one", target: targetResolver, title: "one" })
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
        .step({ content: "old", target: targetResolver, title: "old" });
      const failingWorkflow =
        failureSource === "action"
          ? step
              .do(() => {
                throw boom;
              })
              .build()
          : failureSource === "hook"
            ? step
                .beforeAdvance(() => {
                  throw boom;
                })
                .build()
            : step.build();
      const replacement = tour
        .create(`replacement-${failureSource}`)
        .step({ content: "new", target: targetResolver, title: "new" })
        .build();
      if (failureSource === "view") driver.showError = boom;
      let replacementRun: Promise<void> | null = null;
      tour.state.subscribe((state) => {
        if (state.name === `failing-${failureSource}` && state.status === "error") {
          driver.showError = null;
          replacementRun = tour.run(replacement);
        }
      });

      if (failureSource === "hook") await tour.run(failingWorkflow);
      const failingCommand = failureSource === "hook" ? tour.advance() : tour.run(failingWorkflow);

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
      .step({ content: "one", target: targetResolver, title: "one" })
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

    await tour.run(workflow);

    assert.equal(nestedStartingNotifications, 1);
    outerUnsubscribe();
    nestedUnsubscribe();
  });

  test("stops an old publication when an earlier listener starts a replacement workflow", async () => {
    const tour = createGlowTour<string>();
    const oldWorkflow = tour
      .create("old-publication")
      .step({ content: "old", target: targetResolver, title: "old" })
      .build();
    const replacement = tour
      .create("replacement-publication")
      .step({ content: "new", target: targetResolver, title: "new" })
      .build();
    let replacementRun: Promise<void> | null = null;
    const firstUnsubscribe = tour.state.subscribe((state) => {
      if (state.name === "old-publication" && state.status === "finished") {
        replacementRun = tour.run(replacement);
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

    await tour.run(oldWorkflow);
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
});
