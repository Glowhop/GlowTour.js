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
  WaitUntilOptions,
} from "../types";

const DEFAULT_WAIT_INTERVAL = 16;
const DEFAULT_WAIT_TIMEOUT = 3000;
const INACTIVE_STEP_ERROR = "StepBuilder is no longer active";
const STEP_BUILDER_INTERNAL = Symbol("StepBuilder.internal");

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

export class Builder<T> {
  private readonly steps: WorkflowStepDraft<T>[] = [];
  private currentStep: StepBuilder<T> | null = null;
  private definition: WorkflowDefinition<T> | null = null;

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepParameters<T>): StepBuilder<T> {
    this.assertBuilding();
    this.commitCurrentStep();
    this.currentStep = new StepBuilder(this, {
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

  append(workflow: WorkflowDefinition<T>): StepBuilder<T> {
    this.assertBuilding();
    const drafts = workflow.steps.map(cloneWorkflowStepDraft);
    const lastStep = drafts.at(-1);
    if (!lastStep) throw new Error("Cannot append a workflow without steps");

    this.commitCurrentStep();
    this.steps.push(...drafts.slice(0, -1));
    this.currentStep = new StepBuilder(this, lastStep);
    return this.currentStep;
  }

  finish(): WorkflowDefinition<T> {
    if (this.definition) return this.definition;
    this.commitCurrentStep();
    this.definition = createWorkflowDefinition(this.name, this.options, this.steps);
    return this.definition;
  }

  private assertBuilding(): void {
    if (this.definition) throw new Error("Builder is already finished");
  }

  private commitCurrentStep(): void {
    if (!this.currentStep) return;
    this.steps.push(this.currentStep[STEP_BUILDER_INTERNAL]());
    this.currentStep = null;
  }
}

export class StepBuilder<T> {
  private active = true;

  constructor(
    private readonly owner: Builder<T>,
    private readonly draft: WorkflowStepDraft<T>,
  ) {}

  step(options: StepParameters<T>): StepBuilder<T> {
    this.assertActive();
    return this.owner.step(options);
  }

  append(workflow: WorkflowDefinition<T>): StepBuilder<T> {
    this.assertActive();
    return this.owner.append(workflow);
  }

  finish(): WorkflowDefinition<T> {
    this.assertActive();
    return this.owner.finish();
  }

  clickTarget(): this {
    return this.action(({ target }) => {
      target.click();
      return true;
    });
  }

  focusTarget(): this {
    return this.action(({ target }) => {
      target.focus();
      return true;
    });
  }

  wait(timeMs: number): this {
    this.assertActive();
    assertTimingValue("timeMs", timeMs);
    this.draft.actions.push(timeMs);
    return this;
  }

  waitUntil(predicate: WaitUntilPredicate<T>, options: WaitUntilOptions = {}): this {
    this.assertActive();
    const interval = options.interval ?? DEFAULT_WAIT_INTERVAL;
    const timeout = options.timeout ?? DEFAULT_WAIT_TIMEOUT;
    assertTimingValue("interval", interval);
    assertTimingValue("timeout", timeout);

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

  goNext(): this {
    this.assertActive();
    this.draft.actions.push("next");
    return this;
  }

  goPrevious(): this {
    this.assertActive();
    this.draft.actions.push("previous");
    return this;
  }

  exec(callback: (context: StepContext<T>) => Promise<void> | void): this {
    return this.action(async (context) => {
      await callback(context);
      return true;
    });
  }

  action(callback: StepAction<T>): this {
    this.assertActive();
    this.draft.actions.push(callback);
    return this;
  }

  onNext(callback: StepTransitionAction<T>): this {
    this.assertActive();
    this.draft.nextAction = callback;
    return this;
  }

  onPrevious(callback: StepTransitionAction<T>): this {
    this.assertActive();
    this.draft.previousAction = callback;
    return this;
  }

  onCancel(callback: StepTransitionAction<T>): this {
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

export function create<T>(name: string, options: StartOptions = {}): Builder<T> {
  return new Builder<T>(name, options);
}
