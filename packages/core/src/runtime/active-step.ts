import { Observable } from "@glowhop/observables";
import {
  cloneStepProps,
  freezeStepProps,
  type ReadonlyStartOptions,
  type ReadonlyStepProps,
  type StepProps,
  type WorkflowStepDefinition,
} from "../definition";
import type { ReadonlyStepState } from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeStepBehavior,
} from "../utils/options";
import { resolveTargetElement } from "../utils/utils";

export class ActiveStep<T> {
  readonly initialProps: ReadonlyStepProps<T>;
  readonly props: Observable<StepProps<T>>;
  readonly state: ReadonlyStepState<T>;
  readonly behavior;
  readonly animated: boolean | undefined;
  target: HTMLElement | null = null;

  constructor(
    readonly definition: WorkflowStepDefinition<T>,
    defaults: ReadonlyStartOptions,
  ) {
    this.initialProps = freezeStepProps({
      title: definition.props.title,
      content: definition.props.content,
      data: definition.props.data,
      overlay: mergeOverlayOptions(defaults.overlay, definition.props.overlay),
      popover: mergePopoverOptions(defaults.popover, definition.props.popover),
      indicator: mergeIndicatorOptions(defaults.indicator, definition.props.indicator),
    });
    this.props = new Observable(cloneStepProps(this.initialProps));
    this.state = Object.freeze({
      get: () => freezeStepProps(this.props.get()),
      subscribe: (listener: (props: ReadonlyStepProps<T>) => void) =>
        this.props.subscribe((props) => listener(freezeStepProps(props))),
    });
    this.behavior = mergeStepBehavior(defaults.behavior, definition.behavior);
    this.animated = defaults.animated;
  }

  reset() {
    this.props.set(cloneStepProps(this.initialProps));
  }

  get overlay() {
    return this.props.get().overlay;
  }

  get popover() {
    return this.props.get().popover;
  }

  get indicator() {
    return this.props.get().indicator;
  }

  async resolveTarget(signal: AbortSignal) {
    return await resolveTargetElement(this.definition.target, signal);
  }

  snapshot() {
    return Object.freeze({
      initialProps: freezeStepProps(this.initialProps),
      currentProps: freezeStepProps(this.props.get()),
      target: this.target,
    });
  }
}
