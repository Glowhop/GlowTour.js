import {
  freezeStepProps,
  type ReadonlyStartOptions,
  type ReadonlyStepProps,
  type WorkflowStepDefinition,
} from "../definition";
import type { ReadonlyStepState, StepPropsStore } from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeStepBehavior,
} from "../utils/options";
import { resolveTargetElement } from "../utils/utils";
import { createStepPropsStore } from "./step-props-store";

export class ActiveStep<T> {
  readonly initialProps: ReadonlyStepProps<T>;
  readonly props: StepPropsStore<T>;
  readonly state: ReadonlyStepState<T>;
  readonly behavior;
  readonly animated: boolean | undefined;
  target: HTMLElement | null = null;

  constructor(
    readonly definition: WorkflowStepDefinition<T>,
    defaults: ReadonlyStartOptions,
    reportSubscriberError: (error: unknown) => void = () => {},
    readonly path = "steps[0]",
    private readonly rootDocument?: Document,
  ) {
    this.initialProps = freezeStepProps({
      title: definition.props.title,
      content: definition.props.content,
      data: definition.props.data,
      overlay: mergeOverlayOptions(defaults.overlay, definition.props.overlay),
      popover: mergePopoverOptions(defaults.popover, definition.props.popover),
      indicator: mergeIndicatorOptions(defaults.indicator, definition.props.indicator),
    });
    this.props = createStepPropsStore(this.initialProps, reportSubscriberError, path);
    this.state = Object.freeze({
      get: () => this.props.get(),
      subscribe: (listener: (props: ReadonlyStepProps<T>) => void) =>
        this.props.subscribe(listener),
    });
    this.behavior = mergeStepBehavior(defaults.behavior, definition.behavior);
    this.animated = defaults.animated;
  }

  reset() {
    this.props.set(this.initialProps);
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
    return await resolveTargetElement(
      this.definition.target,
      { document: this.rootDocument, signal },
      this.path,
    );
  }

  snapshot() {
    return Object.freeze({
      initialProps: freezeStepProps(this.initialProps),
      currentProps: freezeStepProps(this.props.get()),
      target: this.target,
    });
  }
}
