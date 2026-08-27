import { Observable } from "@glowhop/observables";
import { WorkflowBuilder } from "../builder";
import {
  cloneStepProps,
  freezeStepProps,
  type ReadonlyStepProps,
  type WorkflowDefinition,
} from "../definition";
import {
  DomTourViewDriver,
  NoopTourViewDriver,
  type TourViewDriver,
} from "../dom/tour-view-driver";
import type {
  DynamicStepProps,
  GlowTour,
  StartOptions,
  StepWaitInstruction,
  StepContext,
  TourDirection,
  TourState,
  TourStatus,
} from "../types";
import { ActiveStep } from "./active-step";
import { attachRootBridge } from "./root-bridge";

const DEFAULT_TARGET_TIMEOUT = 3000;
const DISPOSED_ERROR_MESSAGE = "Tour controller is disposed";

function abortError() {
  return new DOMException("The operation was aborted", "AbortError");
}

function normalizedError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function waitForTimer(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      reject(abortError());
    };
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, delay);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

interface TourControllerOptions {
  assertCanRun?: () => void;
  onDispose?: () => void;
}

type TourPresentation<T> = Pick<
  TourState<T>,
  | "canGoNext"
  | "canCancel"
  | "canGoPrevious"
  | "currentStep"
  | "currentStepIndex"
  | "isFirstStep"
  | "isLastStep"
  | "totalSteps"
>;

export class TourController<T> {
  private readonly snapshot: Observable<TourState<T>>;
  private workflow: WorkflowDefinition<T> | null = null;
  private steps: ActiveStep<T>[] = [];
  private index = -1;
  private direction: TourDirection = "next";
  private status: TourStatus = "idle";
  private error: Error | null = null;
  private operationToken = 0;
  private publicationRevision = 0;
  private operation: AbortController | null = null;
  private disposed = false;
  private retainedPresentation: TourPresentation<T> | null = null;
  private readonly stateListeners = new Set<(state: TourState<T>) => void>();

  readonly state = Object.freeze({
    get: () => this.snapshot.get(),
    subscribe: (listener: (state: TourState<T>) => void) => {
      if (this.disposed) return () => {};
      listener(this.snapshot.get());
      if (this.disposed) return () => {};
      this.stateListeners.add(listener);
      return () => {
        this.stateListeners.delete(listener);
      };
    },
  });

  constructor(
    private readonly driver: TourViewDriver<T> = new NoopTourViewDriver<T>(),
    private readonly options: TourControllerOptions = {},
  ) {
    this.snapshot = new Observable<TourState<T>>(this.createSnapshot());
    this.driver.setCommands?.({
      goNext: () => this.goNext(),
      canGoNext: () => this.canNavigate("next"),
      canCancel: () => this.status === "active" && this.isCancelAvailable(),
      canGoPrevious: () => this.canNavigate("previous"),
      cancel: () => this.cancel(),
      isNextDisabled: () => !this.isPresentedNextAvailable(),
      isCancelDisabled: () => !this.isPresentedCancelAvailable(),
      isPreviousDisabled: () => !this.isPresentedPreviousAvailable(),
      goPrevious: () => this.goPrevious(),
      reportError: async (error) => {
        if (this.disposed || this.status === "idle") return;
        const operation = this.beginOperation();
        try {
          await this.handleFailure(error, operation);
        } catch {
          // The failure is exposed through the public state.
        }
      },
      subscribeCapabilities: (listener) =>
        this.state.subscribe((state) => listener(state.status === "active")),
    });
  }

  create(name: string, options: StartOptions = {}) {
    return new WorkflowBuilder<T>(name, options);
  }

  async run(workflow: WorkflowDefinition<T>) {
    this.assertNotDisposed();
    this.options.assertCanRun?.();
    const retainedPresentation = this.capturePresentation();
    const operation = this.beginOperation();
    this.workflow = workflow;
    this.steps = workflow.steps.map((step) => new ActiveStep(step, workflow.options));
    this.index = -1;
    this.error = null;
    this.retainedPresentation = retainedPresentation;

    try {
      this.setStatus("starting");
      this.assertCurrent(operation);
      await workflow.options.onStart?.();
      this.assertCurrent(operation);
      if (this.steps.length === 0) {
        await this.finish(operation);
        return;
      }
      await this.enter(0, "next", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async goNext() {
    this.assertNotDisposed();
    if (!this.canNavigate("next")) return;
    const operation = this.beginOperation();
    try {
      await this.navigate("next", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async goPrevious() {
    this.assertNotDisposed();
    if (!this.canNavigate("previous")) return;
    const operation = this.beginOperation();
    try {
      await this.navigate("previous", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async goToStep(index: number) {
    this.assertNotDisposed();
    if (this.status === "starting" || this.status === "transitioning") return;
    if (index < 0 || index >= this.steps.length) {
      throw new Error(`Step index ${index} is out of bounds`);
    }
    if (this.status !== "active" || index === this.index) return;
    const direction = index > this.index ? "next" : "previous";
    if (!this.canNavigate(direction)) return;
    const operation = this.beginOperation();
    try {
      await this.navigate(direction, operation, index);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async cancel() {
    this.assertNotDisposed();
    if (!this.workflow || !this.canCancel()) return;
    const operation = this.beginOperation();
    try {
      await this.cancelCurrent(operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  updateCurrentStep(update: (props: ReadonlyStepProps<T>) => DynamicStepProps<T>) {
    if (this.disposed || this.status !== "active") return;
    const step = this.currentStep();
    if (!step) return;
    step.props.set((props) => {
      const next = update(freezeStepProps(props));
      return cloneStepProps(next);
    });
    this.publish();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidateOperation();
    this.steps = [];
    this.workflow = null;
    this.index = -1;
    this.retainedPresentation = null;
    this.stateListeners.clear();
    this.options.onDispose?.();
    this.driver.dispose();
  }

  isDisposed() {
    return this.disposed;
  }

  /** @internal Called by the private root bridge before it releases DOM resources. */
  beginMountRelease() {
    if (this.disposed) return;
    this.invalidateOperation();
    this.workflow = null;
    this.steps = [];
    this.index = -1;
    this.direction = "next";
    this.error = null;
    this.retainedPresentation = null;
    this.status = "idle";
  }

  /** @internal Called after the private root bridge has finished releasing its lease. */
  completeMountRelease() {
    if (!this.disposed) this.publish();
  }

  private async enter(index: number, direction: TourDirection, operation: number): Promise<void> {
    this.direction = direction;
    this.setStatus("transitioning");
    this.assertCurrent(operation);
    const step = this.steps[index];
    if (!step) throw new Error(`Step index ${index} is out of bounds`);
    if (step.initialProps.resetPropsOnEnter !== false) step.reset();
    const target = await this.resolveTarget(step, operation);
    this.assertCurrent(operation);
    if (!target) {
      const nextIndex = direction === "next" ? index + 1 : index - 1;
      if (nextIndex >= this.steps.length) await this.finish(operation);
      else if (nextIndex < 0) {
        if (this.canCancel()) await this.cancelCurrent(operation);
        else this.setStatus("active");
      } else await this.enter(nextIndex, direction, operation);
      return;
    }
    step.target = target;
    let committed = false;
    const commitStep = () => {
      this.assertCurrent(operation);
      if (committed) return;
      committed = true;
      this.index = index;
      this.retainedPresentation = null;
      this.publish();
    };
    await this.driver.show(step, direction, this.signalFor(operation), commitStep);
    this.assertCurrent(operation);
    commitStep();
    this.setStatus("active");
    this.assertCurrent(operation);
    await this.runActions(operation);
  }

  private async navigate(direction: TourDirection, operation: number, destination?: number) {
    const step = this.currentStep();
    if (!step) return;
    this.setStatus("transitioning");
    this.assertCurrent(operation);
    const hook = direction === "next" ? step.definition.nextAction : step.definition.previousAction;
    await hook?.(this.createStepContext(step, operation));
    this.assertCurrent(operation);

    if (destination !== undefined) {
      await this.enter(destination, direction, operation);
      return;
    }
    if (direction === "next") {
      const nextIndex = this.index + 1;
      if (nextIndex >= this.steps.length) await this.finish(operation);
      else await this.enter(nextIndex, direction, operation);
      return;
    }
    if (this.index === 0) {
      if (this.canCancel()) await this.cancelCurrent(operation);
      else this.setStatus("active");
      return;
    }
    await this.enter(this.index - 1, direction, operation);
  }

  private async runActions(operation: number) {
    const step = this.currentStep();
    if (!step) return;
    for (const action of step.definition.actions) {
      this.assertCurrent(operation);
      if (typeof action === "number") {
        await waitForTimer(action, this.signalFor(operation));
        this.assertCurrent(operation);
        continue;
      }
      if (action === "next") {
        await this.navigate("next", operation);
        return;
      }
      if (action === "previous") {
        await this.navigate("previous", operation);
        return;
      }
      const shouldContinue = await action(this.createStepContext(step, operation));
      this.assertCurrent(operation);
      if (shouldContinue === false) return;
    }
  }

  private async waitForAction(
    action: StepWaitInstruction<T>,
    step: ActiveStep<T>,
    operation: number,
  ) {
    const startedAt = Date.now();
    while (true) {
      this.assertCurrent(operation);
      const elapsedBeforePredicate = Date.now() - startedAt;
      if (
        await this.evaluateWaitPredicate(
          action,
          step,
          operation,
          Math.max(0, action.timeout - elapsedBeforePredicate),
        )
      ) {
        return;
      }
      this.assertCurrent(operation);
      const elapsed = Date.now() - startedAt;
      if (elapsed >= action.timeout) {
        throw new Error(`Timed out waiting for ${action.description} after ${action.timeout}ms`);
      }
      await waitForTimer(
        Math.min(action.interval, action.timeout - elapsed),
        this.signalFor(operation),
      );
    }
  }

  private evaluateWaitPredicate(
    action: StepWaitInstruction<T>,
    step: ActiveStep<T>,
    operation: number,
    remaining: number,
  ) {
    const signal = this.signalFor(operation);
    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
      };
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const onAbort = () => settle(() => reject(abortError()));
      const timeout = setTimeout(
        () =>
          settle(() =>
            reject(
              new Error(`Timed out waiting for ${action.description} after ${action.timeout}ms`),
            ),
          ),
        remaining,
      );
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve()
        .then(() => action.predicate(step.target, step.state))
        .then(
          (ready) => settle(() => resolve(ready)),
          (error) => settle(() => reject(error)),
        );
    });
  }

  private async resolveTarget(step: ActiveStep<T>, operation: number) {
    const signal = this.signalFor(operation);
    const strategy = step.behavior?.missingTargetStrategy ?? "error";
    const timeout = step.behavior?.targetTimeout ?? DEFAULT_TARGET_TIMEOUT;
    const startedAt = Date.now();
    while (true) {
      const target = await step.resolveTarget(signal);
      this.assertCurrent(operation);
      if (target) return target;
      if (strategy === "skip") return null;
      if (strategy !== "wait" || Date.now() - startedAt >= timeout) {
        throw new Error(`Missing target: ${String(step.definition.target)}`);
      }
      await waitForTimer(16, signal);
      this.assertCurrent(operation);
    }
  }

  private async finish(operation: number) {
    await this.driver.clear(this.signalFor(operation));
    this.assertCurrent(operation);
    this.retainedPresentation = null;
    this.setStatus("finished");
    this.assertCurrent(operation);
    await this.workflow?.options.onFinish?.();
    this.assertCurrent(operation);
  }

  private async cancelCurrent(operation: number) {
    const step = this.currentStep();
    if (step?.definition.cancelAction) {
      await step.definition.cancelAction(this.createStepContext(step, operation));
    }
    this.assertCurrent(operation);
    await this.driver.clear(this.signalFor(operation));
    this.assertCurrent(operation);
    this.retainedPresentation = null;
    this.setStatus("cancelled");
    this.assertCurrent(operation);
    await this.workflow?.options.onCancel?.();
    this.assertCurrent(operation);
  }

  private async handleFailure(reason: unknown, operation: number) {
    if (!this.isCurrent(operation)) return;
    const error = normalizedError(reason);
    this.error = error;
    this.retainedPresentation = null;
    this.setStatus("error");
    if (!this.isCurrent(operation)) throw error;
    try {
      await this.driver.clear(this.signalFor(operation));
    } catch {
      // The original failure remains the public error.
    }
    throw error;
  }

  private beginOperation() {
    this.invalidateOperation();
    this.operation = new AbortController();
    return this.operationToken;
  }

  private createStepContext(step: ActiveStep<T>, operation: number): StepContext<T> {
    if (!step.target) throw new Error("Cannot create a step context without a target");
    return Object.freeze({
      props: step.props,
      signal: this.signalFor(operation),
      target: step.target,
    });
  }

  private invalidateOperation() {
    this.operationToken += 1;
    this.operation?.abort();
    this.operation = null;
  }

  private signalFor(operation: number) {
    this.assertCurrent(operation);
    const signal = this.operation?.signal;
    if (!signal) throw abortError();
    return signal;
  }

  private assertCurrent(operation: number) {
    if (!this.isCurrent(operation)) throw abortError();
  }

  private isCurrent(operation: number) {
    return (
      !this.disposed &&
      operation === this.operationToken &&
      this.operation?.signal.aborted === false
    );
  }

  private assertNotDisposed() {
    if (this.disposed) throw new Error(DISPOSED_ERROR_MESSAGE);
  }

  private currentStep() {
    return this.index >= 0 ? (this.steps[this.index] ?? null) : null;
  }

  private canNavigate(direction: TourDirection) {
    if (this.status !== "active") return false;
    return direction === "next" ? this.isNextAvailable() : this.isPreviousAvailable();
  }

  private isNextAvailable() {
    const props = this.currentStep()?.props.get();
    return props !== undefined && props.disableNextButton !== true;
  }

  private isPreviousAvailable() {
    const props = this.currentStep()?.props.get();
    return props !== undefined && props.disablePreviousButton !== true && this.index > 0;
  }

  private isCancelAvailable() {
    return this.currentStep() !== null && this.canCancel();
  }

  private isPresentedNextAvailable() {
    return this.currentStep()
      ? this.isNextAvailable()
      : (this.retainedPresentation?.canGoNext ?? false);
  }

  private isPresentedPreviousAvailable() {
    return this.currentStep()
      ? this.isPreviousAvailable()
      : (this.retainedPresentation?.canGoPrevious ?? false);
  }

  private isPresentedCancelAvailable() {
    return this.currentStep()
      ? this.isCancelAvailable()
      : (this.retainedPresentation?.canCancel ?? false);
  }

  private canCancel() {
    return (
      (this.workflow?.options.cancellable ?? true) &&
      this.status !== "finished" &&
      this.status !== "cancelled" &&
      this.status !== "error"
    );
  }

  private setStatus(status: TourStatus) {
    this.status = status;
    this.publish();
  }

  private publish() {
    const revision = ++this.publicationRevision;
    const state = this.createSnapshot();
    this.snapshot.set(state);
    for (const listener of Array.from(this.stateListeners)) {
      if (this.disposed || revision !== this.publicationRevision) break;
      listener(state);
      if (this.disposed || revision !== this.publicationRevision) break;
    }
  }

  private createSnapshot(): TourState<T> {
    const currentStep = this.currentStep();
    const retained = currentStep ? null : this.retainedPresentation;
    const currentStepIndex = retained?.currentStepIndex ?? this.index;
    const totalSteps = retained?.totalSteps ?? this.steps.length;
    const isFirstStep = retained?.isFirstStep ?? currentStepIndex === 0;
    const isLastStep =
      retained?.isLastStep ?? (currentStepIndex === totalSteps - 1 && currentStepIndex >= 0);
    return Object.freeze({
      name: this.workflow?.name ?? "",
      totalSteps,
      currentStepIndex,
      currentStep: currentStep?.snapshot() ?? retained?.currentStep ?? null,
      direction: this.direction,
      canGoNext: this.isPresentedNextAvailable(),
      canGoPrevious: this.isPresentedPreviousAvailable(),
      canCancel: this.isPresentedCancelAvailable(),
      isFirstStep,
      isLastStep,
      status: this.status,
      error: this.error,
    });
  }

  private capturePresentation(): TourPresentation<T> | null {
    if (this.retainedPresentation) return this.retainedPresentation;
    if (this.status !== "active" && this.status !== "transitioning") return null;
    const state = this.createSnapshot();
    if (!state.currentStep) return null;
    return {
      canGoNext: state.canGoNext,
      canCancel: state.canCancel,
      canGoPrevious: state.canGoPrevious,
      currentStep: state.currentStep,
      currentStepIndex: state.currentStepIndex,
      isFirstStep: state.isFirstStep,
      isLastStep: state.isLastStep,
      totalSteps: state.totalSteps,
    };
  }
}

export function createGlowTour<T>(): GlowTour<T> {
  const driver = new DomTourViewDriver<T>();
  let bridge!: ReturnType<typeof attachRootBridge<T>>;
  const controller = new TourController<T>(driver, {
    assertCanRun: () => bridge.assertConnected(),
    onDispose: () => bridge.release(),
  });
  const tour: GlowTour<T> = {
    goNext: () => controller.goNext(),
    cancel: () => controller.cancel(),
    create: (name, options) => controller.create(name, options),
    dispose: () => controller.dispose(),
    goToStep: (index) => controller.goToStep(index),
    goPrevious: () => controller.goPrevious(),
    run: (workflow) => controller.run(workflow),
    state: controller.state,
    updateCurrentStep: (update) => controller.updateCurrentStep(update),
  };
  bridge = attachRootBridge(
    tour,
    driver,
    () => controller.isDisposed(),
    () => controller.beginMountRelease(),
    () => controller.completeMountRelease(),
  );
  return Object.freeze(tour);
}
