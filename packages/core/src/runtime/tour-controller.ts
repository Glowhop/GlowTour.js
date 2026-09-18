import { WorkflowBuilder } from "../builder";
import type { WorkflowDefinition } from "../definition";
import { DomTourViewDriver, type TourViewDriver } from "../dom/tour-view-driver";
import { validateWorkflowOptions } from "../options/validation";
import type {
  GlowTour,
  GlowTourOptions,
  LifecycleHookContext,
  RunOptions,
  StartOptions,
  StepContext,
  StepHookAction,
  StepHookContext,
  TourDirection,
  TourEvent,
  TourEventListener,
  TourEventSource,
  TourEventType,
  TourState,
  TourStatus,
} from "../types";
import { isControlAvailable } from "../utils/options";
import { abortableDelay, abortError } from "./abort";
import { ActiveStep } from "./active-step";
import { attachRootBridge } from "./root-bridge";

const DEFAULT_TARGET_TIMEOUT = 3000;
/**
 * How long a step stays frozen on its last known position after its target
 * disappears from the DOM, before the configured `missingTarget.strategy`
 * takes over. Covers the dominant case — a framework remounting the target
 * within a frame or two — without a visible unmount/remount flicker. Not
 * configurable: it is a presentation detail of the recovery, not a policy
 * choice; `missingTarget.strategy` and `missingTarget.timeout` remain the only knobs.
 * Exported for the test suite's timing assertions only.
 */
export const TARGET_LOSS_GRACE_MS = 150;
const DISPOSED_ERROR_MESSAGE = "Tour controller is disposed";

/**
 * Resolves a step id (`RunOptions.startAt`, `goTo()`) to its index. Throws rather than silently
 * falling back: a stale id means the caller's stored position no longer matches the workflow, and
 * restarting an onboarding, or jumping nowhere, without saying so is a bug the end user sees.
 */
function resolveStepIndex<T>(workflow: WorkflowDefinition<T>, id: string): number {
  const index = workflow.steps.findIndex((step) => step.id === id);
  if (index === -1) throw new Error(`Workflow "${workflow.name}" has no step with id "${id}".`);
  return index;
}

function normalizedError(error: unknown) {
  if (error instanceof Error) return error;
  try {
    return new Error(String(error));
  } catch {
    return new Error("Unknown error");
  }
}

interface TourControllerOptions<T> extends GlowTourOptions {
  // biome-ignore lint/suspicious/noConfusingVoidType: unit-test controllers may use a guard without a DOM document.
  assertCanRun?: (workflow: WorkflowDefinition<T>) => Document | void;
  onDispose?: () => void;
  reportUnhandledError?: (error: Error) => void;
}

type TourPresentation<T> = Pick<
  TourState<T>,
  "canCancel" | "currentStep" | "currentStepIndex" | "isFirstStep" | "isLastStep" | "totalSteps"
> & {
  readonly advanceButtonAvailable: boolean;
  readonly previousButtonAvailable: boolean;
};

export class TourController<T> {
  private snapshot: TourState<T>;
  private workflow: WorkflowDefinition<T> | null = null;
  private steps: ActiveStep<T>[] = [];
  private index = -1;
  private direction: TourDirection = "advance";
  private status: TourStatus = "idle";
  private error: Error | null = null;
  /**
   * The target currently being recovered from a disconnect, if any. The
   * public status stays "active" through the grace period (see
   * TARGET_LOSS_GRACE_MS), so it can no longer serve as the re-entrancy guard
   * a repeated or overlapping `targetDisconnected` notification for the same
   * target relies on — this field takes over that job instead.
   */
  private recoveringTarget: HTMLElement | null = null;
  private operationToken = 0;
  private publicationRevision = 0;
  private operation: AbortController | null = null;
  private disposed = false;
  private retainedPresentation: TourPresentation<T> | null = null;
  private readonly stateListeners = new Set<(state: TourState<T>) => void>();
  private readonly stepPropsSubscriptions: Array<() => void> = [];
  private tourStartedAt = 0;
  private stepEnteredAt = 0;
  /**
   * The step `tour:start` names, while that event is held back. It is emitted just before the
   * first event that can no longer be taken back, so a start that a `beforeEnter` aborts emits nothing.
   */
  private pendingTourStart: ActiveStep<T> | null | undefined;
  private commandSource: TourEventSource = "api";

  readonly state = Object.freeze({
    get: () => this.snapshot,
    subscribe: (listener: (state: TourState<T>) => void) => {
      if (this.disposed) return () => {};
      this.notifyStateListener(listener, this.snapshot);
      if (this.disposed) return () => {};
      this.stateListeners.add(listener);
      return () => {
        this.stateListeners.delete(listener);
      };
    },
  });

  constructor(
    private readonly driver: TourViewDriver<T>,
    private readonly options: TourControllerOptions<T> = {},
  ) {
    this.snapshot = this.createSnapshot();
    this.driver.setCommands?.({
      advance: (source) => this.advance(source),
      canAdvance: () => this.canNavigate("advance"),
      canCancel: () => this.status === "active" && this.isCancelAvailable(),
      canPrevious: () => this.canNavigate("previous"),
      cancel: (source) => this.cancel(source),
      goTo: (id) => this.goTo(id),
      isAdvanceDisabled: () => !this.isPresentedAdvanceAvailable(),
      isCancelDisabled: () => !this.isPresentedCancelAvailable(),
      isPreviousDisabled: () => !this.isPresentedPreviousAvailable(),
      previous: (source) => this.previous(source),
      reportError: async (error) => {
        if (this.disposed || this.status === "idle") return;
        const operation = this.beginOperation();
        try {
          await this.handleFailure(error, operation);
        } catch {
          // The failure is exposed through the public state.
        }
      },
      targetDisconnected: async (target) => {
        await this.recoverDisconnectedTarget(target);
      },
      subscribeCapabilities: (listener) =>
        this.state.subscribe((state) => listener(state.status === "active")),
    });
  }

  create(name: string, options: StartOptions<T> = {}) {
    return new WorkflowBuilder<T>(name, options);
  }

  async start(workflow: WorkflowDefinition<T>, runOptions: RunOptions = {}) {
    this.assertNotDisposed();
    validateWorkflowOptions(workflow);
    const startIndex =
      runOptions.startAt === undefined ? 0 : resolveStepIndex(workflow, runOptions.startAt);
    const rootDocument = this.options.assertCanRun?.(workflow) ?? undefined;
    const retainedPresentation = this.capturePresentation();
    const operation = this.beginOperation();
    this.workflow = workflow;
    this.releaseStepPropsSubscriptions();
    this.steps = workflow.steps.map(
      (step, index) =>
        new ActiveStep(
          step,
          workflow.options,
          (error) => this.reportSubscriberError(error),
          `steps[${index}]`,
          rootDocument,
        ),
    );
    for (const step of this.steps) {
      this.stepPropsSubscriptions.push(
        step.props.subscribe(() => {
          if (!this.disposed && this.currentStep() === step) this.publish();
        }),
      );
    }
    this.index = -1;
    this.error = null;
    this.commandSource = "api";
    this.retainedPresentation = retainedPresentation;

    try {
      this.setStatus("starting");
      this.assertCurrent(operation);
      const { context: startContext, isAborted: isStartAborted } = this.createLifecycleHookContext(
        this.steps[startIndex] ?? null,
      );
      await workflow.options.onStart?.(startContext);
      this.assertCurrent(operation);
      if (isStartAborted()) {
        await this.resetToIdle(operation);
        return;
      }
      this.tourStartedAt = Date.now();
      this.pendingTourStart = this.steps[startIndex] ?? null;
      if (this.steps.length === 0) {
        await this.finish(operation);
        return;
      }
      await this.navigate(startIndex, "advance", operation);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  async advance(source: TourEventSource = "api") {
    this.assertNotDisposed();
    await this.transitionFromPublic("advance", undefined, source);
  }

  async previous(source: TourEventSource = "api") {
    this.assertNotDisposed();
    await this.transitionFromPublic("previous", undefined, source);
  }

  async goTo(id: string) {
    this.assertNotDisposed();
    const workflow = this.workflow;
    if (!workflow || this.status === "starting" || this.status === "transitioning") return;
    const index = resolveStepIndex(workflow, id);
    await this.transitionFromPublic(this.directionTo(index), index, "api");
  }

  /** The direction of a jump from the current step to the step at `index`. */
  private directionTo(index: number): TourDirection {
    return index > this.index ? "advance" : "previous";
  }

  async cancel(source: TourEventSource = "api") {
    this.assertNotDisposed();
    if (!this.workflow || !this.canCancel()) return;
    this.commandSource = source;
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
    this.direction = "advance";
    this.error = null;
    this.retainedPresentation = null;
    this.status = "disposed";
    this.publish(true);
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

  /**
   * Moves to the step at `index`, or further in `direction` past steps skipped for a missing target.
   * Nothing is emitted before `beforeEnter` lets the navigation through, so an abort leaves no trace.
   * Then come the held `tour:start`, a `step:skip` per skipped step, and one `step:leave` for the
   * step being left. `lostStep` is the step whose target disappeared during recovery: it cannot stay
   * on screen, so reaching the first-step boundary or an abort turns into its missing-target error.
   */
  private async navigate(
    index: number,
    direction: TourDirection,
    operation: number,
    lostStep?: ActiveStep<T>,
  ): Promise<void> {
    const from = this.currentStep();
    // `transition()` already published it after running `beforeLeave`.
    if (this.status !== "transitioning") this.setStatus("transitioning");
    this.assertCurrent(operation);
    const skipped: ActiveStep<T>[] = [];
    let step = this.steps[index];
    let target: HTMLElement | null = null;
    while (step) {
      target = await this.resolveTarget(step, operation);
      this.assertCurrent(operation);
      if (target) break;
      skipped.push(step);
      index += direction === "advance" ? 1 : -1;
      step = this.steps[index];
    }
    if (!step || !target) {
      // Leaving the step reports this navigation; staying on it keeps the direction that brought it.
      if (index >= this.steps.length || lostStep) this.direction = direction;
      if (index >= this.steps.length) await this.finish(operation, skipped);
      else if (!lostStep) this.setStatus("active");
      else await this.cancelCurrent(operation);
      return;
    }
    step.target = target;
    step.direction = direction;
    // Runs before the step is committed and shown, so props set here are the first ones rendered.
    if (await this.runStepHook(step.definition.beforeEnter, step, operation, direction)) {
      if (lostStep) throw this.missingTargetError(lostStep);
      if (from) this.setStatus("active");
      else await this.resetToIdle(operation);
      return;
    }
    // Committed before `step:leave`: that event reports the navigation that causes the departure,
    // not the one that brought the user in.
    this.direction = direction;
    this.flushTourStart();
    for (const skippedStep of skipped) this.emit("step:skip", skippedStep, 0);
    this.emitStepLeave(from);
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
    this.stepEnteredAt = Date.now();
    this.emit("step:enter", step, 0);
    await this.runActions(operation);
  }

  private async transitionFromPublic(
    direction: TourDirection,
    destination?: number,
    source: TourEventSource = "api",
  ) {
    if (!this.canNavigate(direction, destination)) return;
    this.commandSource = source;
    const operation = this.beginOperation();
    try {
      await this.transition(direction, operation, destination);
    } catch (error) {
      await this.handleFailure(error, operation);
    }
  }

  private async transition(direction: TourDirection, operation: number, destination?: number) {
    if (!this.canNavigate(direction, destination)) return;
    const step = this.currentStep();
    if (!step) return;
    this.setStatus("transitioning");
    this.assertCurrent(operation);
    if (await this.runStepHook(step.definition.beforeLeave, step, operation, direction)) {
      this.setStatus("active");
      return;
    }
    // `canNavigate` already refuses going back from the first step.
    await this.navigate(
      destination ?? this.index + (direction === "advance" ? 1 : -1),
      direction,
      operation,
    );
  }

  /** Runs `beforeEnter` or `beforeLeave`, and tells whether it called `abort()` before settling. */
  private async runStepHook(
    hook: StepHookAction<T> | null,
    step: ActiveStep<T>,
    operation: number,
    direction: TourDirection,
  ) {
    if (!hook) return false;
    let aborted = false;
    await hook(
      Object.freeze({
        ...this.createStepHookContext(step, operation, direction),
        abort: () => {
          aborted = true;
        },
      }),
    );
    this.assertCurrent(operation);
    return aborted;
  }

  private async runActions(operation: number) {
    const step = this.currentStep();
    if (!step) return;
    for (const action of step.definition.actions) {
      this.assertCurrent(operation);
      if (typeof action === "number") {
        await abortableDelay(action, this.signalFor(operation));
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
    const missingTarget = step.props.get().behavior?.missingTarget;
    const strategy = missingTarget?.strategy ?? "error";
    const timeout = missingTarget?.timeout ?? DEFAULT_TARGET_TIMEOUT;
    const startedAt = Date.now();
    step.detached = false;
    while (true) {
      const target = await step.resolveTarget(signal);
      this.assertCurrent(operation);
      if (target) return target;
      if (strategy === "skip") return null;
      const body = strategy === "detached" && step.detach();
      if (body) return body;
      if (strategy !== "wait" || Date.now() - startedAt >= timeout) {
        throw this.missingTargetError(step);
      }
      await abortableDelay(16, signal);
      this.assertCurrent(operation);
    }
  }

  /**
   * Repeatedly re-resolves `step.target` until it succeeds or `budgetMs`
   * elapses, polling every 16ms like `resolveTarget`. Unlike `resolveTarget`
   * it never applies `missingTarget.strategy` itself — callers decide what a
   * timed-out budget means (grace period vs. a "wait" strategy's own
   * timeout), so the same polling loop serves both.
   */
  private async pollForTarget(step: ActiveStep<T>, operation: number, budgetMs: number) {
    const startedAt = Date.now();
    while (true) {
      const target = await step.resolveTarget(this.signalFor(operation));
      this.assertCurrent(operation);
      if (target) return target;
      if (Date.now() - startedAt >= budgetMs) return null;
      await abortableDelay(16, this.signalFor(operation));
      this.assertCurrent(operation);
    }
  }

  /**
   * Recovers from a target disconnecting while its step is on screen. The
   * driver has already frozen the presentation in place (overlay, popover,
   * pointer held at their last position; focus guard and scroll lock still
   * engaged) and stopped polling geometry — this only decides how long to
   * keep it frozen and what to do once that budget runs out.
   *
   * The public status stays "active" for the whole freeze, "wait" included.
   * A frozen presentation isn't a transition: nothing is animating, the step
   * and its index are unchanged, and the popover is still on screen. Calling
   * it "transitioning" would close `canNavigate` and leave the user staring
   * at a live-looking popover whose buttons are dead for the rest of the
   * budget — the popover is the escape hatch out of a target that never
   * comes back, so it has to keep working.
   */
  private async recoverDisconnectedTarget(target: HTMLElement) {
    if (this.disposed || this.status !== "active" || this.recoveringTarget === target) return;
    const step = this.currentStep();
    if (!step || step.target !== target) return;
    this.recoveringTarget = target;
    const index = this.index;
    const direction = this.direction;
    const operation = this.beginOperation();
    try {
      this.assertCurrent(operation);
      let recovered = await this.pollForTarget(step, operation, TARGET_LOSS_GRACE_MS);
      this.assertCurrent(operation);
      if (!recovered) {
        const strategy = step.props.get().behavior?.missingTarget?.strategy ?? "error";
        if (strategy === "skip") {
          await this.navigate(
            index + (direction === "advance" ? 1 : -1),
            direction,
            operation,
            step,
          );
          return;
        }
        // The grace period counts against the "wait" budget rather than
        // extending it — a longer configured timeout is the only way to wait
        // longer overall, `missingTarget.timeout` is never silently doubled.
        recovered =
          strategy === "detached"
            ? step.detach()
            : strategy === "wait"
              ? await this.pollForTarget(
                  step,
                  operation,
                  (step.props.get().behavior?.missingTarget?.timeout ?? DEFAULT_TARGET_TIMEOUT) -
                    TARGET_LOSS_GRACE_MS,
                )
              : null;
        this.assertCurrent(operation);
        if (!recovered) throw this.missingTargetError(step);
      }
      step.target = recovered;
      await this.driver.retarget(step, this.signalFor(operation));
      this.assertCurrent(operation);
      // The status doesn't change (still "active"), but the step's target
      // did — publish so consumers reading `currentStep.target` see it.
      this.publish();
    } catch (error) {
      try {
        await this.handleFailure(error, operation);
      } catch {
        // The failure is exposed through the public state.
      }
    } finally {
      if (this.recoveringTarget === target) this.recoveringTarget = null;
    }
  }

  private missingTargetError(step: ActiveStep<T>) {
    return new Error(`Missing target at ${step.path}: ${String(step.definition.target)}`);
  }

  private async finish(operation: number, skipped: readonly ActiveStep<T>[] = []) {
    this.assertCurrent(operation);
    const step = this.currentStep();
    const { context, isAborted } = this.createLifecycleHookContext(step);
    await this.workflow?.options.onFinish?.(context);
    this.assertCurrent(operation);
    if (isAborted()) {
      if (step) this.setStatus("active");
      else await this.resetToIdle(operation);
      return;
    }
    this.flushTourStart();
    for (const skippedStep of skipped) this.emit("step:skip", skippedStep, 0);
    this.emitStepLeave(step);
    await this.driver.clear(this.signalFor(operation));
    this.assertCurrent(operation);
    this.retainedPresentation = null;
    this.setStatus("finished");
    this.emit("tour:complete", step, Date.now() - this.tourStartedAt);
    this.assertCurrent(operation);
  }

  private async cancelCurrent(operation: number) {
    const step = this.currentStep();
    const { context, isAborted } = this.createLifecycleHookContext(step);
    await this.workflow?.options.onCancel?.(context);
    this.assertCurrent(operation);
    if (isAborted()) {
      this.setStatus("active");
      return;
    }
    this.flushTourStart();
    this.emitStepLeave(step);
    await this.driver.clear(this.signalFor(operation));
    this.assertCurrent(operation);
    this.retainedPresentation = null;
    this.setStatus("cancelled");
    this.emit("tour:cancel", step, Date.now() - this.tourStartedAt);
    this.assertCurrent(operation);
  }

  private createLifecycleHookContext(step: ActiveStep<T> | null): {
    context: LifecycleHookContext<T>;
    isAborted: () => boolean;
  } {
    let aborted = false;
    const context: LifecycleHookContext<T> = Object.freeze({
      step: step?.snapshot() ?? null,
      abort: () => {
        aborted = true;
      },
    });
    return { context, isAborted: () => aborted };
  }

  /**
   * Restores the controller to its pre-`start()` idle state. Used when an
   * aborted hook prevents the tour from ever becoming active (`onStart`, the
   * first step's `beforeEnter`, and the zero-step `onFinish` edge case). A
   * tour this `start()` replaced is still on screen, so it is cleared first.
   */
  private async resetToIdle(operation: number) {
    if (this.retainedPresentation) {
      await this.driver.clear(this.signalFor(operation));
      this.assertCurrent(operation);
    }
    this.workflow = null;
    this.releaseStepPropsSubscriptions();
    this.steps = [];
    this.index = -1;
    this.retainedPresentation = null;
    this.pendingTourStart = undefined;
    this.setStatus("idle");
  }

  private async handleFailure(reason: unknown, operation: number) {
    if (!this.isCurrent(operation)) return;
    const error = normalizedError(reason);
    this.error = error;
    this.retainedPresentation = null;
    this.setStatus("error");
    // No `step:leave` here: the step was not left, the tour died on it. The
    // event names that step so the pair still reconciles in an analytics funnel.
    this.flushTourStart();
    this.emit("tour:error", this.currentStep(), Date.now() - this.tourStartedAt, error);
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
    return Object.freeze({
      ...this.createStepHookContext(step, operation, step.direction),
      advance: async () => {
        onControl?.();
        this.assertCurrent(operation);
        await this.transition("advance", operation);
      },
      cancel: async () => {
        onControl?.();
        this.assertCurrent(operation);
        if (this.canCancel()) await this.cancelCurrent(operation);
      },
      goTo: async (id: string) => {
        onControl?.();
        this.assertCurrent(operation);
        if (!this.workflow) return;
        const index = resolveStepIndex(this.workflow, id);
        await this.transition(this.directionTo(index), operation, index);
      },
      previous: async () => {
        onControl?.();
        this.assertCurrent(operation);
        await this.transition("previous", operation);
      },
    });
  }

  private createStepHookContext(
    step: ActiveStep<T>,
    operation: number,
    direction: TourDirection,
  ): Omit<StepHookContext<T>, "abort"> {
    if (!step.target) throw new Error("Cannot create a step context without a target");
    return Object.freeze({
      direction,
      initialProps: step.initialProps,
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

  private canNavigate(direction: TourDirection, destination?: number) {
    if (this.status !== "active" || !this.currentStep()) return false;
    if (destination !== undefined) {
      return destination >= 0 && destination < this.steps.length && destination !== this.index;
    }
    return direction === "advance" || this.index > 0;
  }

  private isAdvanceButtonAvailable() {
    return isControlAvailable(this.currentStep()?.props.get(), "advance");
  }

  private isPreviousButtonAvailable() {
    return isControlAvailable(this.currentStep()?.props.get(), "previous") && this.index > 0;
  }

  private isCancelAvailable() {
    return this.currentStep() !== null && this.canCancel();
  }

  private isPresentedAdvanceAvailable() {
    return this.currentStep()
      ? this.isAdvanceButtonAvailable()
      : (this.retainedPresentation?.advanceButtonAvailable ?? false);
  }

  private isPresentedPreviousAvailable() {
    return this.currentStep()
      ? this.isPreviousButtonAvailable()
      : (this.retainedPresentation?.previousButtonAvailable ?? false);
  }

  private isPresentedCancelAvailable() {
    return this.currentStep()
      ? this.isCancelAvailable()
      : (this.retainedPresentation?.canCancel ?? false);
  }

  private canCancel() {
    return this.status !== "finished" && this.status !== "cancelled" && this.status !== "error";
  }

  private setStatus(status: TourStatus) {
    this.status = status;
    this.publish();
  }

  private publish(allowDisposed = false) {
    const revision = ++this.publicationRevision;
    const state = this.createSnapshot();
    this.snapshot = state;
    for (const listener of Array.from(this.stateListeners)) {
      if ((!allowDisposed && this.disposed) || revision !== this.publicationRevision) break;
      this.notifyStateListener(listener, state);
      if ((!allowDisposed && this.disposed) || revision !== this.publicationRevision) break;
    }
  }

  private notifyStateListener(listener: (state: TourState<T>) => void, state: TourState<T>) {
    try {
      listener(state);
    } catch (error) {
      this.reportSubscriberError(error);
    }
  }

  /**
   * True when at least one listener is attached. Every emission site checks this
   * first so that a tour with no monitoring builds no payloads and reads no clock.
   */
  private hasEventListeners() {
    return Boolean(this.options.onEvent ?? this.workflow?.options.onEvent);
  }

  private emit(
    type: TourEventType,
    step: ActiveStep<T> | null,
    durationMs: number,
    error: Error | null = null,
  ) {
    const instanceListener = this.options.onEvent;
    const workflowListener = this.workflow?.options.onEvent;
    if (!instanceListener && !workflowListener) return;
    const index = step ? this.steps.indexOf(step) : -1;
    const event: TourEvent = Object.freeze({
      direction: this.direction,
      durationMs,
      error,
      source: this.commandSource,
      stepCount: this.steps.length,
      stepId: step?.definition.id ?? null,
      stepIndex: index,
      timestamp: Date.now(),
      type,
      workflowName: this.workflow?.name ?? "",
    });
    // A listener must never be able to break a tour: it cannot abort a
    // transition, and anything it throws is routed to the subscriber-error
    // channel rather than the tour's own error path.
    this.notifyEventListener(instanceListener, event);
    this.notifyEventListener(workflowListener, event);
  }

  private notifyEventListener(listener: TourEventListener | undefined, event: TourEvent) {
    if (!listener) return;
    try {
      listener(event);
    } catch (error) {
      this.reportSubscriberError(error);
    }
  }

  /** Emits the held `tour:start` once, before the first event that can no longer be taken back. */
  private flushTourStart() {
    const step = this.pendingTourStart;
    if (step === undefined) return;
    this.pendingTourStart = undefined;
    this.emit("tour:start", step, 0);
  }

  /** Emits `step:leave` for the step being left, with the time spent on it. */
  private emitStepLeave(step: ActiveStep<T> | null) {
    if (!step || !this.hasEventListeners()) return;
    this.emit("step:leave", step, Date.now() - this.stepEnteredAt);
  }

  private reportSubscriberError(reason: unknown) {
    const error = normalizedError(reason);
    const onSubscriberError = this.options.onSubscriberError;
    if (!onSubscriberError) {
      this.reportUnhandledError(error);
      return;
    }
    try {
      Promise.resolve(onSubscriberError(error)).catch((hookError: unknown) => {
        this.reportUnhandledError(normalizedError(hookError));
      });
    } catch (hookError) {
      this.reportUnhandledError(normalizedError(hookError));
    }
  }

  private reportUnhandledError(error: Error) {
    const reporter =
      this.options.reportUnhandledError ??
      ((reason: Error) => {
        throw reason;
      });
    queueMicrotask(() => reporter(error));
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
      canAdvance: this.canNavigate("advance"),
      canPrevious: this.canNavigate("previous"),
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
      advanceButtonAvailable: this.isAdvanceButtonAvailable(),
      canCancel: state.canCancel,
      currentStep: state.currentStep,
      currentStepIndex: state.currentStepIndex,
      isFirstStep: state.isFirstStep,
      isLastStep: state.isLastStep,
      previousButtonAvailable: this.isPreviousButtonAvailable(),
      totalSteps: state.totalSteps,
    };
  }
}

/**
 * Creates a new GlowTour.js instance.
 * @param options Tour options for error handling.
 * @returns A tour controller ready to run workflows.
 */
export function createGlowTour<T>(options: GlowTourOptions = {}): GlowTour<T> {
  const driver = new DomTourViewDriver<T>();
  let bridge!: ReturnType<typeof attachRootBridge<T>>;

  const controller = new TourController<T>(driver, {
    assertCanRun: (workflow) => bridge.assertCanRun(workflow),
    onDispose: () => bridge.release(),
    onEvent: options.onEvent,
    onSubscriberError: options.onSubscriberError,
  });

  const tour: GlowTour<T> = {
    advance: () => controller.advance(),
    cancel: () => controller.cancel(),
    create: (name, options) => controller.create(name, options),
    dispose: () => controller.dispose(),
    goTo: (id) => controller.goTo(id),
    previous: () => controller.previous(),
    start: (workflow, runOptions) => controller.start(workflow, runOptions),
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
