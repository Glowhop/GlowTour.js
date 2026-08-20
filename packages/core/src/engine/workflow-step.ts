import { Observable } from "@glowhop/observables";
import type { ReadonlyStartOptions } from "../definition";
import type {
  DynamicStepProps,
  EventHandler,
  IndicatorOptions,
  OverlayOptions,
  PopoverOptions,
  ScrollOptions,
  StepActionInstruction,
  StepBehavior,
  StepConstructor,
  StepTransitionAction,
  TargetResolver,
  WorkflowStepPublicProps,
} from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeScrollOptions,
  mergeStepBehavior,
} from "../utils/options";
import { resolveTargetElement } from "../utils/utils";

export class WorkflowStep<T> {
  readonly target: TargetResolver;
  readonly overlay?: OverlayOptions;
  readonly popover?: PopoverOptions;
  readonly indicator?: IndicatorOptions;
  readonly scroll?: ScrollOptions;
  readonly behavior?: StepBehavior;
  targetEl: HTMLElement | null;
  readonly actions: StepActionInstruction<T>[];
  readonly eventHandlers: EventHandler<T>[];
  nextAction: StepTransitionAction<T> | null;
  backAction: StepTransitionAction<T> | null;
  cancelAction: StepTransitionAction<T> | null;
  readonly props: Observable<DynamicStepProps<T>>;
  readonly initialProps: Readonly<DynamicStepProps<T>>;

  constructor(definition: StepConstructor<T>) {
    this.target = definition.target;
    this.overlay = definition.overlay;
    this.popover = definition.popover;
    this.indicator = definition.indicator;
    this.scroll = definition.scroll;
    this.behavior = definition.behavior;
    this.targetEl = null;
    this.actions = [];
    this.eventHandlers = [];
    this.nextAction = null;
    this.backAction = null;
    this.cancelAction = null;

    this.initialProps = Object.freeze({
      ...definition.props,
      data: definition.props.data,
    });

    const initialState: DynamicStepProps<T> = {
      ...this.initialProps,
      data: this.initialProps.data ? structuredClone(this.initialProps.data) : undefined,
    };
    this.props = new Observable<DynamicStepProps<T>>(initialState);
  }

  addAction(action: StepActionInstruction<T>) {
    this.actions.push(action);
  }

  addEventHandler(handler: EventHandler<T>) {
    this.eventHandlers.push(handler);
  }

  setNextAction(action: StepTransitionAction<T> | null) {
    this.nextAction = action;
  }

  setBackAction(action: StepTransitionAction<T> | null) {
    this.backAction = action;
  }

  setCancelAction(action: StepTransitionAction<T> | null) {
    this.cancelAction = action;
  }

  clone(defaults: ReadonlyStartOptions = {}) {
    const clone = new WorkflowStep<T>({
      target: this.target,
      overlay: mergeOverlayOptions(defaults.overlay, this.overlay),
      popover: mergePopoverOptions(defaults.popover, this.popover),
      indicator: mergeIndicatorOptions(defaults.indicator, this.indicator),
      scroll: mergeScrollOptions(defaults.scroll, this.scroll),
      behavior: mergeStepBehavior(defaults.behavior, this.behavior),
      props: this.initialProps,
    });

    for (const action of this.actions) {
      clone.addAction(action);
    }
    for (const eventHandler of this.eventHandlers) {
      clone.addEventHandler(eventHandler);
    }
    clone.setNextAction(this.nextAction);
    clone.setBackAction(this.backAction);
    clone.setCancelAction(this.cancelAction);

    return clone;
  }

  reset() {
    this.props.set({
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    });
  }

  async resolveTargetElement() {
    this.targetEl = await resolveTargetElement(this.target);
  }

  getElement() {
    return this.targetEl;
  }

  getPublicProps(): WorkflowStepPublicProps<T> {
    return {
      initialProps: this.initialProps,
      currentProps: this.props,
      target: this.targetEl,
    };
  }
}
