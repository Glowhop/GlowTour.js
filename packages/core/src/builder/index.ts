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
  StepParameters,
  StepTransitionAction,
  StepWaitPredicate,
  WaitOptions,
} from "../types";

export type EventName = keyof HTMLElementEventMap;

type EventForName<TEventName extends EventName> = HTMLElementEventMap[TEventName];

const DEFAULT_WAIT_TIMEOUT = 3000;
const DEFAULT_WAIT_INTERVAL = 50;

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

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepParameters<T>) {
    if (this.currentStep) {
      this.steps.push(this.currentStep.toDraft());
    }
    this.currentStep = new WorkflowStepBuilder(this, {
      target: options.target,
      props: {
        title: options.title,
        content: options.content,
        hideFooter: options.hideFooter,
        disableBackButton: options.disableBackButton,
        hideBackButton: options.hideBackButton,
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
      backAction: null,
      cancelAction: null,
    });
    return this.currentStep;
  }

  concat(builder: WorkflowStepBuilder<T>) {
    const definition = builder.builder.build();
    const drafts = definition.steps.map(cloneWorkflowStepDraft);
    const lastStep = drafts.at(-1);
    if (!lastStep) {
      throw new Error("Cannot concat a builder without steps");
    }
    if (this.currentStep) {
      this.steps.push(this.currentStep.toDraft());
    }
    this.steps.push(...drafts.slice(0, -1));
    this.currentStep = new WorkflowStepBuilder(this, lastStep);
    return this.currentStep;
  }

  build(): WorkflowDefinition<T> {
    const drafts = this.currentStep ? [...this.steps, this.currentStep.toDraft()] : this.steps;
    return createWorkflowDefinition(this.name, this.options, drafts);
  }
}

export class WorkflowStepBuilder<T> {
  constructor(
    public readonly builder: WorkflowBuilder<T>,
    private readonly draft: WorkflowStepDraft<T>,
  ) {}

  step(options: StepParameters<T>) {
    return this.builder.step(options);
  }

  build() {
    return this.builder.build();
  }

  concat(builder: WorkflowStepBuilder<T>) {
    return this.builder.concat(builder);
  }

  clickTarget() {
    this.draft.actions.push(async (nextTarget) => {
      nextTarget?.click();
      return true;
    });
    return this;
  }

  focusTarget() {
    this.draft.actions.push(async (nextTarget) => {
      nextTarget?.focus();
      return true;
    });
    return this;
  }

  delay(timeMs: number) {
    if (!Number.isFinite(timeMs) || timeMs < 0) {
      throw new TypeError("delay must be a finite non-negative number");
    }
    this.draft.actions.push(timeMs);
    return this;
  }

  waitFor(predicate: StepWaitPredicate<T>, options?: WaitOptions) {
    this.draft.actions.push({
      description: "condition",
      predicate,
      type: "waitFor",
      ...waitOptions(options),
    });
    return this;
  }

  waitForElement(target: string, options?: WaitOptions) {
    this.draft.actions.push({
      description: `element ${target}`,
      predicate: () => typeof document !== "undefined" && document.querySelector(target) !== null,
      type: "waitFor",
      ...waitOptions(options),
    });
    return this;
  }

  advance() {
    this.draft.actions.push("advance");
    return this;
  }

  previous() {
    this.draft.actions.push("previous");
    return this;
  }

  do(callback: StepAction<T>) {
    this.draft.actions.push(callback);
    return this;
  }

  beforeAdvance(callback: StepTransitionAction<T>) {
    this.draft.nextAction = callback;
    return this;
  }

  beforePrevious(callback: StepTransitionAction<T>) {
    this.draft.backAction = callback;
    return this;
  }

  beforeCancel(callback: StepTransitionAction<T>) {
    this.draft.cancelAction = callback;
    return this;
  }

  on<const TEventName extends EventName>(
    event: TEventName,
    callback: EventHandler<T, EventForName<TEventName>>["callback"],
  ): this;
  on<const TEventNames extends readonly EventName[]>(
    events: TEventNames,
    callback: EventHandler<T, EventForName<TEventNames[number]>>["callback"],
  ): this;
  on(
    eventOrEvents: EventName | readonly EventName[],
    callback: EventHandler<T, never>["callback"],
  ) {
    return this.addEventHandlers(eventOrEvents, callback);
  }

  toDraft(): WorkflowStepDraft<T> {
    return cloneWorkflowStepDraft(this.draft);
  }

  private addEventHandlers(
    eventOrEvents: EventName | readonly EventName[],
    callback: EventHandler<T, never>["callback"],
  ) {
    for (const event of typeof eventOrEvents === "string" ? [eventOrEvents] : eventOrEvents) {
      this.draft.eventHandlers.push({ event, callback: callback as EventHandler<T>["callback"] });
    }
    return this;
  }
}
