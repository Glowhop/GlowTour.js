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
} from "../types";

export type EventName = keyof HTMLElementEventMap;

type EventForName<TEventName extends EventName> = HTMLElementEventMap[TEventName];

export class Builder<T> {
  private readonly steps: WorkflowStepDraft<T>[] = [];
  private currentStep: StepBuilder<T> | null = null;

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepParameters<T>) {
    if (this.currentStep) {
      this.steps.push(this.currentStep.toDraft());
    }
    this.currentStep = new StepBuilder(this, {
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

  concat(builder: StepBuilder<T>) {
    const definition = builder.builder.finish();
    const drafts = definition.steps.map(cloneWorkflowStepDraft);
    const lastStep = drafts.at(-1);
    if (!lastStep) {
      throw new Error("Cannot concat a builder without steps");
    }
    if (this.currentStep) {
      this.steps.push(this.currentStep.toDraft());
    }
    this.steps.push(...drafts.slice(0, -1));
    this.currentStep = new StepBuilder(this, lastStep);
    return this.currentStep;
  }

  finish(): WorkflowDefinition<T> {
    const drafts = this.currentStep ? [...this.steps, this.currentStep.toDraft()] : this.steps;
    return createWorkflowDefinition(this.name, this.options, drafts);
  }
}

export class StepBuilder<T> {
  constructor(
    public readonly builder: Builder<T>,
    private readonly draft: WorkflowStepDraft<T>,
  ) {}

  step(options: StepParameters<T>) {
    return this.builder.step(options);
  }

  finish() {
    return this.builder.finish();
  }

  concat(builder: StepBuilder<T>) {
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

  wait(timeMs: number) {
    this.draft.actions.push(timeMs);
    return this;
  }

  waitFor(callback: (nextTarget: HTMLElement | null) => Promise<boolean> | boolean) {
    this.draft.actions.push(async (nextTarget) => callback(nextTarget));
    return this;
  }

  alter(callback: StepAction<T>) {
    return this.action(callback);
  }

  waitForElement(target: string) {
    this.draft.actions.push(
      async () => typeof document !== "undefined" && document.querySelector(target) !== null,
    );
    return this;
  }

  next() {
    this.draft.actions.push("next");
    return this;
  }

  back() {
    this.draft.actions.push("back");
    return this;
  }

  exec(callback: (nextTarget: HTMLElement | null) => Promise<void> | void) {
    this.draft.actions.push(async (nextTarget) => {
      await callback(nextTarget);
      return true;
    });
    return this;
  }

  action(callback: StepAction<T>) {
    this.draft.actions.push(callback);
    return this;
  }

  onNext(callback: StepTransitionAction<T>) {
    this.draft.nextAction = callback;
    return this;
  }

  onBack(callback: StepTransitionAction<T>) {
    this.draft.backAction = callback;
    return this;
  }

  onCancel(callback: StepTransitionAction<T>) {
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

  onEvent<const TEventName extends EventName>(
    event: TEventName,
    callback: EventHandler<T, EventForName<TEventName>>["callback"],
  ): this;
  onEvent<const TEventNames extends readonly EventName[]>(
    events: TEventNames,
    callback: EventHandler<T, EventForName<TEventNames[number]>>["callback"],
  ): this;
  onEvent(
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

export function create<T>(name: string, options: StartOptions = {}) {
  return new Builder<T>(name, options);
}
