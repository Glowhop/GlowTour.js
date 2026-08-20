import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import type { TourViewDriver } from "../dom/tour-view-driver";
import { createGlowTour } from "../index";
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

class RecordingDriver implements TourViewDriver<string> {
  clearCalls = 0;
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
}

describe("instance-first TourController", () => {
  test("builds frozen plain definitions and isolates mutable step data per run", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("readonly", {
        cancellable: true,
        popover: { keyboardShortcuts: { next: ["Enter"] } },
      })
      .step({
        content: "content",
        data: { count: 1 },
        overlay: { animation: { duration: 100, easing: "linear" } },
        target: targetResolver,
        title: "title",
      })
      .finish();

    assert.equal(Object.getPrototypeOf(workflow), Object.prototype);
    assert.equal(Object.isFrozen(workflow), true);
    assert.equal(Object.isFrozen(workflow.steps), true);
    assert.equal(Object.isFrozen(workflow.steps[0]), true);
    assert.equal(Object.isFrozen(workflow.steps[0].props.data), true);
    assert.equal(Object.isFrozen(workflow.options.popover?.keyboardShortcuts?.next), true);
    assert.equal(Object.isFrozen(workflow.steps[0].overlay?.animation), true);
    assert.equal("clone" in workflow.steps[0], false);

    await tour.run(workflow);
    assert.equal(Object.isFrozen(tour.state.get().currentStep), true);
    assert.equal(Object.isFrozen(tour.state.get().currentStep?.currentProps.data), true);
    tour.updateCurrentStep((props) => ({ ...props, data: { count: 2 } }));
    assert.deepEqual(tour.state.get().currentStep?.currentProps.data, { count: 2 });
    assert.deepEqual(workflow.steps[0].props.data, { count: 1 });

    await tour.run(workflow);
    assert.deepEqual(tour.state.get().currentStep?.currentProps.data, { count: 1 });
  });

  test("runs, advances, and finishes with coherent state", async () => {
    const tour = createGlowTour<string>();
    const snapshots: string[] = [];
    const unsubscribe = tour.state.subscribe((state) => snapshots.push(state.status));
    const workflow = tour
      .create("lifecycle")
      .step({ content: "one", target: targetResolver, title: "one" })
      .finish();

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
      "active",
      "transitioning",
      "finished",
    ]);
    unsubscribe();
  });

  test("cancels from the first step only when the workflow is cancellable", async () => {
    const cancellable = createGlowTour<string>();
    const allowed = cancellable
      .create("allowed", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .finish();
    await cancellable.run(allowed);
    await cancellable.previous();
    assert.equal(cancellable.state.get().status, "cancelled");

    const nonCancellable = createGlowTour<string>();
    const denied = nonCancellable
      .create("denied", { cancellable: false })
      .step({ content: "one", target: targetResolver, title: "one" })
      .finish();
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
      .onNext(async () => {
        calls += 1;
      })
      .finish();
    await tour.run(workflow);
    await tour.advance();
    assert.equal(calls, 1);

    const failingTour = createGlowTour<string>();
    const failing = failingTour
      .create("failing-hook")
      .step({ content: "one", target: targetResolver, title: "one" })
      .onNext(() => {
        throw new TypeError("hook failed");
      })
      .finish();
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
      .onNext(() => gate.promise)
      .finish();
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
      .finish();
    const current = tour
      .create("current")
      .step({ content: "current", target: targetResolver, title: "current" })
      .finish();

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
      .finish();
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
      .finish();
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
      .finish();

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
          .finish(),
      );
      assert.equal(selectorTour.state.get().currentStep?.target, target);

      const syncTour = createGlowTour<string>();
      await syncTour.run(
        syncTour
          .create("sync")
          .step({ content: "one", target: () => target, title: "one" })
          .finish(),
      );
      assert.equal(syncTour.state.get().status, "active");

      const asyncTour = createGlowTour<string>();
      await asyncTour.run(
        asyncTour
          .create("async")
          .step({ content: "one", target: async () => target, title: "one" })
          .finish(),
      );
      assert.equal(asyncTour.state.get().status, "active");

      const errorTour = createGlowTour<string>();
      await assert.rejects(
        () =>
          errorTour.run(
            errorTour
              .create("error")
              .step({ content: "one", target: () => null, title: "one" })
              .finish(),
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
          .finish(),
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
          .finish(),
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
    const workflow = tour
      .create("update")
      .step({ content: "one", data: { value: 1 }, target: targetResolver, title: "one" })
      .finish();
    await tour.run(workflow);
    tour.updateCurrentStep((props) => ({ ...props, data: { value: 2 }, title: "two" }));
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
      .finish();
    await tour.run(workflow);
    assert.equal(starts, 1);
    assert.equal(finishes, 1);
    assert.equal(tour.state.get().status, "finished");
  });

  test("runs definition actions in order and lets navigation actions advance", async () => {
    const calls: string[] = [];
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("actions")
      .step({ content: "one", target: targetResolver, title: "one" })
      .action(async (_element, props) => {
        calls.push(String(props.get().title));
        return true;
      })
      .next()
      .step({ content: "two", target: targetResolver, title: "two" })
      .finish();

    await tour.run(workflow);

    assert.deepEqual(calls, ["one"]);
    assert.equal(tour.state.get().currentStepIndex, 1);
    assert.equal(tour.state.get().status, "active");
  });

  test("turns action errors into terminal controller errors and clears the view", async () => {
    const driver = new RecordingDriver();
    const tour = new TourController<string>(driver);
    const workflow = tour
      .create("action-error")
      .step({ content: "one", target: targetResolver, title: "one" })
      .action(() => {
        throw new TypeError("action failed");
      })
      .finish();

    await assert.rejects(() => tour.run(workflow), /action failed/);
    assert.equal(tour.state.get().status, "error");
    assert.equal(tour.state.get().error?.message, "action failed");
    assert.equal(driver.clearCalls, 1);
    await tour.cancel();
    assert.equal(tour.state.get().status, "error");
  });

  test("honors disabled navigation props in state and commands", async () => {
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("disabled-navigation")
      .step({
        content: "one",
        disableNextButton: true,
        target: targetResolver,
        title: "one",
      })
      .step({
        content: "two",
        disableBackButton: true,
        target: targetResolver,
        title: "two",
      })
      .finish();

    await tour.run(workflow);
    assert.equal(tour.state.get().canAdvance, false);
    await tour.advance();
    assert.equal(tour.state.get().currentStepIndex, 0);

    tour.updateCurrentStep((props) => ({ ...props, disableNextButton: false }));
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
      .onNext(() => {
        calls += 1;
        return hook.promise;
      })
      .step({ content: "two", target: targetResolver, title: "two" })
      .finish();
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
      .finish();

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
      .finish();
    await tour.run(workflow);
    const notificationsBeforeDispose = notifications;

    tour.dispose();
    tour.dispose();
    tour.updateCurrentStep(() => {
      throw new Error("must not run");
    });

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
      .finish();

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
      .finish();

    await assert.rejects(() => tour.run(workflow), /resolver aborted itself/);
    assert.equal(tour.state.get().status, "error");
  });

  test("cancel invalidates a pending transition without stale state changes", async () => {
    const hook = deferred<void>();
    const tour = createGlowTour<string>();
    const workflow = tour
      .create("cancel-transition", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .onNext(() => hook.promise)
      .step({ content: "two", target: targetResolver, title: "two" })
      .finish();
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
    const oldWorkflow = tour.create("old-empty").finish();
    const newWorkflow = tour
      .create("new-empty", {
        onFinish: () => {
          newWorkflowFinishes += 1;
        },
      })
      .finish();
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
      .onNext(() => {
        oldHookCalls += 1;
      })
      .finish();
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
      .onNext(() => {
        oldHookCalls += 1;
      })
      .finish();
    const newWorkflow = tour
      .create("new")
      .step({ content: "new", target: targetResolver, title: "new" })
      .finish();
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
      .onNext(() => {
        oldHookCalls += 1;
      })
      .finish();
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

  test("exposes previous on the first step only when it can cancel", async () => {
    const cancellableTour = createGlowTour<string>();
    const cancellable = cancellableTour
      .create("cancellable", { cancellable: true })
      .step({ content: "one", target: targetResolver, title: "one" })
      .finish();
    await cancellableTour.run(cancellable);
    assert.equal(cancellableTour.state.get().canPrevious, true);
    cancellableTour.updateCurrentStep((props) => ({ ...props, disableBackButton: true }));
    assert.equal(cancellableTour.state.get().canPrevious, false);

    const fixedTour = createGlowTour<string>();
    const fixed = fixedTour
      .create("fixed", { cancellable: false })
      .step({ content: "one", target: targetResolver, title: "one" })
      .finish();
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
      .finish();

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
      .finish();

    await tour.run(workflow);

    assert.equal(listenerCounts.added, 1);
    assert.equal(listenerCounts.removed, 1);
  });
});
