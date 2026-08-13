import { WorkflowStep } from "../engine/workflow-step";
import type {
  EventHandler,
  StartOptions,
  StepAction,
  StepParameters,
  StepTransitionAction,
  WorkflowDefinition,
} from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeScrollOptions,
  mergeStepBehavior,
} from "../utils/options";

function cloneStartOptions(options: StartOptions): StartOptions {
  return {
    ...options,
    overlay: mergeOverlayOptions(undefined, options.overlay),
    popover: mergePopoverOptions(undefined, options.popover),
    indicator: mergeIndicatorOptions(undefined, options.indicator),
    scroll: mergeScrollOptions(undefined, options.scroll),
    behavior: mergeStepBehavior(undefined, options.behavior),
  };
}

export class Builder<T> {
  private steps: WorkflowStep<T>[] = [];
  private currentStep: StepBuilder<T> | null = null;

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepParameters<T>) {
    if (this.currentStep) {
      this.steps.push(this.currentStep.toStep());
    }

    this.currentStep = new StepBuilder(
      this,
      new WorkflowStep({
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
          data: options.data,
        },
        overlay: mergeOverlayOptions(this.options.overlay, options.overlay),
        popover: mergePopoverOptions(this.options.popover, options.popover),
        indicator: mergeIndicatorOptions(this.options.indicator, options.indicator),
        scroll: mergeScrollOptions(this.options.scroll, options.scroll),
        behavior: mergeStepBehavior(this.options.behavior, options.behavior),
      }),
    );

    return this.currentStep;
  }

  concat(builder: StepBuilder<T>) {
    const definition = builder.builder.finish();
    const steps = definition.steps.map((step) => step.clone());
    const lastStep = steps.at(-1);

    if (!lastStep) {
      throw new Error("Cannot concat a builder without steps");
    }

    if (this.currentStep) {
      this.steps.push(this.currentStep.toStep());
    }

    this.steps.push(...steps.slice(0, -1));
    this.currentStep = new StepBuilder(this, lastStep);
    return this.currentStep;
  }

  finish(): WorkflowDefinition<T> {
    const finalizedSteps = this.currentStep
      ? [...this.steps, this.currentStep.toStep()]
      : [...this.steps];

    return {
      name: this.name,
      options: cloneStartOptions(this.options),
      steps: finalizedSteps.map((step) => step.clone()),
    };
  }
}

export class StepBuilder<T> {
  constructor(
    public readonly builder: Builder<T>,
    private readonly workflowStep: WorkflowStep<T>,
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
    this.workflowStep.addAction(async (target: HTMLElement | null) => {
      target?.click();
      return true;
    });
    return this;
  }

  focusTarget() {
    this.workflowStep.addAction(async (target: HTMLElement | null) => {
      target?.focus();
      return true;
    });
    return this;
  }

  wait(timeMs: number) {
    this.workflowStep.addAction(timeMs);
    return this;
  }

  waitFor(callback: (target: HTMLElement | null) => Promise<boolean> | boolean) {
    this.workflowStep.addAction(async (target: HTMLElement | null) => callback(target));
    return this;
  }

  alter(callback: StepAction<T>) {
    this.workflowStep.addAction(callback);
    return this;
  }

  waitForElement(target: string) {
    this.workflowStep.addAction(async () => !!document.querySelector(target));
    return this;
  }

  next() {
    this.workflowStep.addAction("next");
    return this;
  }

  back() {
    this.workflowStep.addAction("back");
    return this;
  }

  exec(callback: (target: HTMLElement | null) => Promise<void> | void) {
    this.workflowStep.addAction(async (target: HTMLElement | null) => {
      await callback(target);
      return true;
    });
    return this;
  }

  action(callback: StepAction<T>) {
    this.workflowStep.addAction(callback);
    return this;
  }

  onNext(callback: StepTransitionAction<T>) {
    this.workflowStep.setNextAction(callback);
    return this;
  }

  onBack(callback: StepTransitionAction<T>) {
    this.workflowStep.setBackAction(callback);
    return this;
  }

  onCancel(callback: StepTransitionAction<T>) {
    this.workflowStep.setCancelAction(callback);
    return this;
  }

  onEvent(event: string, callback: EventHandler<T>["callback"]) {
    this.workflowStep.addEventHandler({ event, callback });
    return this;
  }

  on(event: string, callback: EventHandler<T>["callback"]) {
    return this.onEvent(event, callback);
  }

  toStep() {
    return this.workflowStep.clone();
  }
}

export function create<T>(name: string, options: StartOptions = {}) {
  return new Builder<T>(name, options);
}
