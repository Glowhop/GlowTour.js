import { Observable } from "@glowhop/observables";
import { Builder } from "../builder";
import {
  cloneStepProps,
  freezeStepProps,
  type ReadonlyStepProps,
  type WorkflowDefinition,
} from "../definition";
import { NoopTourViewDriver, type TourViewDriver } from "../dom/tour-view-driver";
import type {
  DynamicStepProps,
  StartOptions,
  TourDirection,
  TourState,
  TourStatus,
} from "../types";
import { ActiveStep } from "./active-step";

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
  private readonly stateListeners = new Set<(state: TourState<T>) => void>();

  readonly state = {
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
  };

  constructor(private readonly driver: TourViewDriver<T> = new NoopTourViewDriver<T>()) {
    this.snapshot = new Observable<TourState<T>>(this.createSnapshot());
    this.driver.setCommands?.({
      advance: () => this.advance(),
      canAdvance: () => this.canNavigate("advance"),
      canCancel: () => this.status === "active" && this.canCancel(),
      canPrevious: () => this.canNavigate("previous"),
      cancel: () => this.cancel(),
      previous: () => this.previous(),
      subscribeCapabilities: (listener) => this.state.subscribe(() => listener()),
    });
  }

  create(name: string, options: StartOptions = {}) {
    return new Builder<T>(name, options);
  }

  async run(workflow: WorkflowDefinition<T>) {
    this.assertNotDisposed();
    const operation = this.beginOperation();
    this.workflow = workflow;
    this.steps = workflow.steps.map((step) => new ActiveStep(step, workflow.options));
    this.index = -1;
    this.error = null;

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
    this.stateListeners.clear();
    this.driver.dispose();
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
    await this.driver.show(step, direction, this.signalFor(operation));
    this.assertCurrent(operation);
    this.index = index;
    this.setStatus("active");
    this.assertCurrent(operation);
    await this.runActions(operation);
  }

  private async navigate(direction: TourDirection, operation: number, destination?: number) {
    const step = this.currentStep();
    if (!step) return;
    this.setStatus("transitioning");
    this.assertCurrent(operation);
    const hook = direction === "advance" ? step.definition.nextAction : step.definition.backAction;
    await hook?.(step.target, step.props);
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
      if (action === "next") {
        await this.navigate("advance", operation);
        return;
      }
      if (action === "back") {
        await this.navigate("previous", operation);
        return;
      }
      const shouldContinue = await action(step.target, step.props);
      this.assertCurrent(operation);
      if (shouldContinue === false) return;
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
    this.setStatus("finished");
    this.assertCurrent(operation);
    await this.workflow?.options.onFinish?.();
    this.assertCurrent(operation);
  }

  private async cancelCurrent(operation: number) {
    const step = this.currentStep();
    await step?.definition.cancelAction?.(step.target, step.props);
    this.assertCurrent(operation);
    await this.driver.clear(this.signalFor(operation));
    this.assertCurrent(operation);
    this.setStatus("cancelled");
    this.assertCurrent(operation);
    await this.workflow?.options.onCancel?.();
    this.assertCurrent(operation);
  }

  private async handleFailure(reason: unknown, operation: number) {
    if (!this.isCurrent(operation)) return;
    const error = normalizedError(reason);
    this.error = error;
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
    const props = this.currentStep()?.props.get();
    if (direction === "advance") return props?.disableNextButton !== true;
    return props?.disableBackButton !== true && (this.index > 0 || this.canCancel());
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
    const isActive = this.status === "active";
    const isFirstStep = this.index === 0;
    const isLastStep = this.index === this.steps.length - 1 && this.index >= 0;
    return Object.freeze({
      name: this.workflow?.name ?? "",
      totalSteps: this.steps.length,
      currentStepIndex: this.index,
      currentStep: currentStep?.snapshot() ?? null,
      direction: this.direction,
      canAdvance: isActive && currentStep?.props.get().disableNextButton !== true,
      canPrevious: this.canNavigate("previous"),
      canCancel: isActive && this.canCancel(),
      isFirstStep,
      isLastStep,
      status: this.status,
      error: this.error,
    });
  }
}

export function createGlowTour<T>() {
  return new TourController<T>();
}
