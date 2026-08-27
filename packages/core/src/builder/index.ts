import {
  cloneStepProps,
  cloneWorkflowStepDraft,
  createWorkflowDefinition,
  type WorkflowDefinition,
  type WorkflowStepDraft,
} from "../definition";
import type {
  EventHandler,
  StartOptions,
  StepAction,
  StepContext,
  StepParameters,
  StepTransitionAction,
  WaitOptions,
  WaitUntilOptions,
} from "../types";

const DEFAULT_WAIT_INTERVAL = 16;
const DEFAULT_WAIT_TIMEOUT = 3000;
const INACTIVE_STEP_ERROR = "WorkflowStepBuilder is no longer active";
const STEP_BUILDER_INTERNAL = Symbol("WorkflowStepBuilder.internal");

export type EventName = keyof HTMLElementEventMap;

type EventForName<TEventName extends EventName> = HTMLElementEventMap[TEventName];
type WaitUntilPredicate<T> = (context: StepContext<T>) => Promise<boolean> | boolean;

function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

function assertTimingValue(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`);
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function waitTimeoutError(timeout: number): Error {
  return new Error(`waitUntil timed out after ${timeout}ms`);
}

function waitForDelay(delay: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(abortError());
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delay);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForPredicate(
  predicate: () => Promise<boolean> | boolean,
  remainingTime: number,
  timeout: number,
  signal: AbortSignal,
): Promise<boolean> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const onAbort = () => settle(() => reject(abortError()));
    const timeoutId = setTimeout(
      () => settle(() => reject(waitTimeoutError(timeout))),
      remainingTime,
    );
    signal.addEventListener("abort", onAbort, { once: true });
    void Promise.resolve()
      .then(predicate)
      .then(
        (result) => settle(() => resolve(result)),
        (error) => settle(() => reject(error)),
      );
  });
}

function waitOptions(options: WaitOptions = {}) {
  const timeout = options.timeout ?? DEFAULT_WAIT_TIMEOUT;
  const interval = options.interval ?? DEFAULT_WAIT_INTERVAL;
  if (!Number.isFinite(timeout) || timeout < 0) {
    throw new TypeError("wait timeout must be a finite non-negative number");
  }
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new TypeError("wait interval must be a finite positive number");
  }
  return { interval, timeout };
}

export class WorkflowBuilder<T> {
  private readonly steps: WorkflowStepDraft<T>[] = [];
  private currentStep: WorkflowStepBuilder<T> | null = null;
  private definition: WorkflowDefinition<T> | null = null;

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepParameters<T>) {
    this.assertBuilding();
    this.commitCurrentStep();
    this.currentStep = new WorkflowStepBuilder(this, {
      target: options.target,
      props: {
        title: options.title,
        content: options.content,
        hideFooter: options.hideFooter,
        disablePreviousButton: options.disablePreviousButton,
        hidePreviousButton: options.hidePreviousButton,
        disableNextButton: options.disableNextButton,
        hideNextButton: options.hideNextButton,
        disableAutoScroll: options.disableAutoScroll,
        resetPropsOnEnter: options.resetPropsOnEnter,
        data: cloneStepProps(options).data,
      },
      overlay: options.overlay,
      popover: options.popover,
      indicator: options.indicator,
      scroll: options.scroll,
      behavior: options.behavior,
      actions: [],
      eventHandlers: [],
      nextAction: null,
      previousAction: null,
      cancelAction: null,
    });
    return this.currentStep;
  }

  append(workflow: WorkflowDefinition<T>): WorkflowStepBuilder<T> {
    this.assertBuilding();
    const drafts = workflow.steps.map(cloneWorkflowStepDraft);
    const lastStep = drafts.at(-1);
    if (!lastStep) throw new Error("Cannot append a workflow without steps");

    this.commitCurrentStep();
    this.steps.push(...drafts.slice(0, -1));
    this.currentStep = new WorkflowStepBuilder(this, lastStep);
    return this.currentStep;
  }

  build(): WorkflowDefinition<T> {
    if (this.definition) return this.definition;
    this.commitCurrentStep();
    this.definition = createWorkflowDefinition(this.name, this.options, this.steps);
    return this.definition;
  }

  private assertBuilding(): void {
    if (this.definition) throw new Error("WorkflowBuilder is already finished");
  }

  private commitCurrentStep(): void {
    if (!this.currentStep) return;
    this.steps.push(this.currentStep[STEP_BUILDER_INTERNAL]());
    this.currentStep = null;
  }
}

export class WorkflowStepBuilder<T> {
  private active = true;

  constructor(
    private readonly owner: WorkflowBuilder<T>,
    private readonly draft: WorkflowStepDraft<T>,
  ) {}

  step(options: StepParameters<T>): WorkflowStepBuilder<T> {
    this.assertActive();
    return this.owner.step(options);
  }

  append(workflow: WorkflowDefinition<T>): WorkflowStepBuilder<T> {
    this.assertActive();
    return this.owner.append(workflow);
  }

  build(): WorkflowDefinition<T> {
    this.assertActive();
    return this.owner.build();
  }

  clickTarget(): this {
    return this.do(({ target }) => {
      target?.click();
      return true;
    });
  }

  focusTarget(): this {
    return this.do(({ target }) => {
      target?.focus();
      return true;
    });
  }

  wait(timeMs: number) {
    this.assertActive();
    assertTimingValue("timeMs", timeMs);
    this.draft.actions.push(timeMs);
    return this;
  }

  waitUntil(predicate: WaitUntilPredicate<T>, options: WaitUntilOptions = {}): this {
    this.assertActive();
    const { interval, timeout } = waitOptions(options);

    this.draft.actions.push(async (context) => {
      const startedAt = Date.now();
      let attempted = false;
      while (true) {
        throwIfAborted(context.signal);
        const elapsed = Date.now() - startedAt;
        if (attempted && elapsed >= timeout) throw waitTimeoutError(timeout);
        attempted = true;
        if (
          await waitForPredicate(
            () => predicate(context),
            Math.max(0, timeout - elapsed),
            timeout,
            context.signal,
          )
        )
          return true;
        const remainingTime = timeout - (Date.now() - startedAt);
        if (remainingTime <= 0) throw waitTimeoutError(timeout);
        await waitForDelay(Math.min(interval, remainingTime), context.signal);
      }
    });
    return this;
  }

  waitUntilElement(selector: string, options?: WaitUntilOptions): this {
    if (selector.length === 0) throw new TypeError("selector must not be empty");
    return this.waitUntil(
      () => typeof document !== "undefined" && document.querySelector(selector) !== null,
      options,
    );
  }

  do(callback: StepAction<T>) {
    this.assertActive();
    this.draft.actions.push(callback);
    return this;
  }

  beforeAdvance(callback: StepTransitionAction<T>) {
    this.assertActive();
    this.draft.nextAction = callback;
    return this;
  }

  beforePrevious(callback: StepTransitionAction<T>) {
    this.assertActive();
    this.draft.previousAction = callback;
    return this;
  }

  beforeCancel(callback: StepTransitionAction<T>) {
    this.assertActive();
    this.draft.cancelAction = callback;
    return this;
  }

  onTargetEvent<const TEventName extends EventName>(
    event: TEventName,
    callback: EventHandler<T, EventForName<TEventName>>["callback"],
  ): this;
  onTargetEvent<const TEventNames extends readonly EventName[]>(
    events: TEventNames,
    callback: EventHandler<T, EventForName<TEventNames[number]>>["callback"],
  ): this;
  onTargetEvent<TEvent extends Event>(
    event: string,
    callback: EventHandler<T, TEvent>["callback"],
  ): this;
  onTargetEvent(
    eventOrEvents: string | readonly string[],
    callback: EventHandler<T, Event>["callback"],
  ): this {
    this.assertActive();
    const events = typeof eventOrEvents === "string" ? [eventOrEvents] : eventOrEvents;
    if (events.length === 0) throw new TypeError("events must not be empty");
    for (const event of events) {
      if (event.length === 0) throw new TypeError("event name must not be empty");
      this.draft.eventHandlers.push({
        event,
        callback: callback as EventHandler<T>["callback"],
      });
    }
    return this;
  }

  [STEP_BUILDER_INTERNAL](): WorkflowStepDraft<T> {
    this.active = false;
    return cloneWorkflowStepDraft(this.draft);
  }

  private assertActive(): void {
    if (!this.active) throw new Error(INACTIVE_STEP_ERROR);
  }
}
