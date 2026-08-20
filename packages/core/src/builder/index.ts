import type {
  AnimationOptions,
  DynamicStepProps,
  EventHandler,
  PrimitiveValue,
  ReadonlyStartOptions,
  StartOptions,
  StepAction,
  StepActionInstruction,
  StepParameters,
  StepTransitionAction,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "../types";

export type EventName = keyof HTMLElementEventMap;

type EventForName<TEventName extends EventName> = HTMLElementEventMap[TEventName];

type StepDraft<T> = {
  target: StepParameters<T>["target"];
  props: DynamicStepProps<T>;
  overlay?: StepParameters<T>["overlay"];
  popover?: StepParameters<T>["popover"];
  indicator?: StepParameters<T>["indicator"];
  scroll?: StepParameters<T>["scroll"];
  behavior?: StepParameters<T>["behavior"];
  actions: StepActionInstruction<T>[];
  eventHandlers: EventHandler<T>[];
  nextAction: StepTransitionAction<T> | null;
  backAction: StepTransitionAction<T> | null;
  cancelAction: StepTransitionAction<T> | null;
};

function cloneData<T>(data: DynamicStepProps<T>["data"]) {
  return data === undefined ? undefined : structuredClone(data);
}

function freezeRecord<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function freezeData(data: Record<string, PrimitiveValue> | undefined) {
  return data === undefined ? undefined : freezeRecord(structuredClone(data));
}

function freezeAnimation(options: AnimationOptions | undefined) {
  return options && freezeRecord({ ...options });
}

function freezeOverlay(options: StepParameters<unknown>["overlay"]) {
  return (
    options &&
    freezeRecord({
      ...options,
      animation: freezeAnimation(options.animation),
    })
  );
}

function freezePopover(options: StepParameters<unknown>["popover"]) {
  return (
    options &&
    freezeRecord({
      ...options,
      animation: freezeAnimation(options.animation),
      buttons: options.buttons && freezeRecord({ ...options.buttons }),
      keyboardShortcuts:
        options.keyboardShortcuts &&
        freezeRecord({
          back: options.keyboardShortcuts.back && freezeRecord([...options.keyboardShortcuts.back]),
          next: options.keyboardShortcuts.next && freezeRecord([...options.keyboardShortcuts.next]),
          cancel:
            options.keyboardShortcuts.cancel && freezeRecord([...options.keyboardShortcuts.cancel]),
        }),
      placementTryOrder: options.placementTryOrder && freezeRecord([...options.placementTryOrder]),
    })
  );
}

function freezeIndicator(options: StepParameters<unknown>["indicator"]) {
  return (
    options &&
    freezeRecord({
      ...options,
      animation: freezeAnimation(options.animation),
      placementTryOrder: options.placementTryOrder && freezeRecord([...options.placementTryOrder]),
    })
  );
}

function freezeStep<T>(draft: StepDraft<T>): WorkflowStepDefinition<T> {
  const props = freezeRecord({ ...draft.props, data: freezeData(draft.props.data) });
  const step = {
    target: draft.target,
    props,
    overlay: freezeOverlay(draft.overlay),
    popover: freezePopover(draft.popover),
    indicator: freezeIndicator(draft.indicator),
    scroll: draft.scroll && freezeRecord({ ...draft.scroll }),
    behavior: draft.behavior && freezeRecord({ ...draft.behavior }),
    actions: freezeRecord([...draft.actions]),
    eventHandlers: freezeRecord(draft.eventHandlers.map((handler) => freezeRecord({ ...handler }))),
    nextAction: draft.nextAction,
    backAction: draft.backAction,
    cancelAction: draft.cancelAction,
  } satisfies WorkflowStepDefinition<T>;
  return freezeRecord(step);
}

function freezeOptions(options: StartOptions): ReadonlyStartOptions {
  return freezeRecord({
    ...options,
    overlay: freezeOverlay(options.overlay),
    popover: freezePopover(options.popover),
    indicator: freezeIndicator(options.indicator),
    scroll: options.scroll && freezeRecord({ ...options.scroll }),
    behavior: options.behavior && freezeRecord({ ...options.behavior }),
  });
}

export class Builder<T> {
  private readonly steps: StepDraft<T>[] = [];
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
        data: cloneData(options.data),
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
    const drafts = definition.steps.map((step) => ({
      ...step,
      props: { ...step.props, data: cloneData(step.props.data) },
      actions: [...step.actions],
      eventHandlers: [...step.eventHandlers],
    }));
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
    return freezeRecord({
      name: this.name,
      options: freezeOptions(this.options),
      steps: freezeRecord(drafts.map(freezeStep)),
    });
  }
}

export class StepBuilder<T> {
  constructor(
    public readonly builder: Builder<T>,
    private readonly draft: StepDraft<T>,
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

  toDraft(): StepDraft<T> {
    return {
      ...this.draft,
      props: { ...this.draft.props, data: cloneData(this.draft.props.data) },
      actions: [...this.draft.actions],
      eventHandlers: [...this.draft.eventHandlers],
    };
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
