import { Observable } from "@glowhop/observables";
import { WorkflowBuilder } from "../builder";
import type { WorkflowDefinition } from "../definition";
import {
  DomTourViewDriver,
  NoopTourViewDriver,
  type TourViewDriver,
} from "../dom/tour-view-driver";
import type {
  GlowTour,
  StartOptions,
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

interface TourControllerOptions<T> {
  assertCanRun?: (workflow: WorkflowDefinition<T>) => void;
  onDispose?: () => void;
}

type TourPresentation<T> = Pick<
  TourState<T>,
  | "canAdvance"
  | "canCancel"
  | "canPrevious"
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
  private direction: TourDirection = "advance";
  private status: TourStatus = "idle";
  private error: Error | null = null;
  private operationToken = 0;
  private publicationRevision = 0;
  private operation: AbortController | null = null;
  private disposed = false;
  private retainedPresentation: TourPresentation<T> | null = null;
  private readonly stateListeners = new Set<(state: TourState<T>) => void>();
  private readonly stepPropsSubscriptions: Array<() => void> = [];

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
    private readonly options: TourControllerOptions<T> = {},
  ) {
    this.snapshot = new Observable<TourState<T>>(this.createSnapshot());
    this.driver.setCommands?.({
      advance: () => this.advance(),
      canAdvance: () => this.canNavigate("advance"),
      canCancel: () => this.status === "active" && this.isCancelAvailable(),
      canPrevious: () => this.canNavigate("previous"),
      cancel: () => this.cancel(),
      isAdvanceDisabled: () => !this.isPresentedAdvanceAvailable(),
      isCancelDisabled: () => !this.isPresentedCancelAvailable(),
      isPreviousDisabled: () => !this.isPresentedPreviousAvailable(),
      previous: () => this.previous(),
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
    this.options.assertCanRun?.(workflow);
    const retainedPresentation = this.capturePresentation();
    const operation = this.beginOperation();
    this.workflow = workflow;
    this.releaseStepPropsSubscriptions();
    this.steps = workflow.steps.map((step) => new ActiveStep(step, workflow.options));
    for (const step of this.steps) {
      this.stepPropsSubscriptions.push(
        step.props.subscribe(() => {
          if (!this.disposed && this.currentStep() === step) this.publish();
        }),
      );
    }
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
      await this.enter(0, "advance", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async advance() {
    this.assertNotDisposed();
    if (!this.canNavigate("advance")) return;
    const operation = this.beginOperation();
    try {
      await this.navigate("advance", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async previous() {
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
    const direction = index > this.index ? "advance" : "previous";
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

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidateOperation();
    this.releaseStepPropsSubscriptions();
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
    this.releaseStepPropsSubscriptions();
    this.steps = [];
    this.index = -1;
    this.direction = "advance";
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
      const nextIndex = direction === "advance" ? index + 1 : index - 1;
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
    const hook =
      direction === "advance" ? step.definition.advanceAction : step.definition.previousAction;
    await hook?.(this.createStepContext(step, operation));
    this.assertCurrent(operation);

    if (destination !== undefined) {
      await this.enter(destination, direction, operation);
      return;
    }
    if (direction === "advance") {
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
      let controlInvoked = false;
      const shouldContinue = await action(
        this.createStepContext(step, operation, () => {
          controlInvoked = true;
        }),
      );
      this.assertCurrent(operation);
      if (controlInvoked || shouldContinue === false) return;
    }
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

  private createStepContext(
    step: ActiveStep<T>,
    operation: number,
    onControl?: () => void,
  ): StepContext<T> {
    if (!step.target) throw new Error("Cannot create a step context without a target");
    return Object.freeze({
      advance: async () => {
        onControl?.();
        this.assertCurrent(operation);
        await this.navigate("advance", operation);
      },
      cancel: async () => {
        onControl?.();
        this.assertCurrent(operation);
        if (this.canCancel()) await this.cancelCurrent(operation);
      },
      previous: async () => {
        onControl?.();
        this.assertCurrent(operation);
        await this.navigate("previous", operation);
      },
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

  private releaseStepPropsSubscriptions() {
    for (const unsubscribe of this.stepPropsSubscriptions.splice(0)) unsubscribe();
  }

  private canNavigate(direction: TourDirection) {
    if (this.status !== "active") return false;
    return direction === "advance" ? this.isAdvanceAvailable() : this.isPreviousAvailable();
  }

  private isAdvanceAvailable() {
    const props = this.currentStep()?.props.get();
    return props !== undefined && props.disableAdvanceButton !== true;
  }

  private isPreviousAvailable() {
    const props = this.currentStep()?.props.get();
    return props !== undefined && props.disablePreviousButton !== true && this.index > 0;
  }

  private isCancelAvailable() {
    return this.currentStep() !== null && this.canCancel();
  }

  private isPresentedAdvanceAvailable() {
    return this.currentStep()
      ? this.isAdvanceAvailable()
      : (this.retainedPresentation?.canAdvance ?? false);
  }

  private isPresentedPreviousAvailable() {
    return this.currentStep()
      ? this.isPreviousAvailable()
      : (this.retainedPresentation?.canPrevious ?? false);
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
      canAdvance: this.isPresentedAdvanceAvailable(),
      canPrevious: this.isPresentedPreviousAvailable(),
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
      canAdvance: state.canAdvance,
      canCancel: state.canCancel,
      canPrevious: state.canPrevious,
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
    assertCanRun: (workflow) => bridge.assertCanRun(workflow),
    onDispose: () => bridge.release(),
  });

  const tour: GlowTour<T> = {
    advance: () => controller.advance(),
    cancel: () => controller.cancel(),
    create: (name, options) => controller.create(name, options),
    dispose: () => controller.dispose(),
    goToStep: (index) => controller.goToStep(index),
    previous: () => controller.previous(),
    run: (workflow) => controller.run(workflow),
    state: controller.state,
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
