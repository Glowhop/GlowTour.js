import { Observable } from "@glowhop/observables";
import type {
  DynamicStepProps,
  ReadonlyStartOptions,
  ReadonlyStepProps,
  WorkflowStepDefinition,
} from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeScrollOptions,
  mergeStepBehavior,
} from "../utils/options";
import { resolveTargetElement } from "../utils/utils";

function cloneProps<T>(props: ReadonlyStepProps<T>): DynamicStepProps<T> {
  return { ...props, data: props.data === undefined ? undefined : structuredClone(props.data) };
}

function freezeProps<T>(props: ReadonlyStepProps<T>): ReadonlyStepProps<T> {
  return Object.freeze({
    ...props,
    data: props.data === undefined ? undefined : Object.freeze(structuredClone(props.data)),
  });
}

export class ActiveStep<T> {
  readonly initialProps: ReadonlyStepProps<T>;
  readonly props: Observable<DynamicStepProps<T>>;
  readonly overlay;
  readonly popover;
  readonly indicator;
  readonly scroll;
  readonly behavior;
  target: HTMLElement | null = null;

  constructor(
    readonly definition: WorkflowStepDefinition<T>,
    defaults: ReadonlyStartOptions,
  ) {
    this.initialProps = freezeProps(definition.props);
    this.props = new Observable(cloneProps(this.initialProps));
    this.overlay = mergeOverlayOptions(defaults.overlay, definition.overlay);
    this.popover = mergePopoverOptions(defaults.popover, definition.popover);
    this.indicator = mergeIndicatorOptions(defaults.indicator, definition.indicator);
    this.scroll = mergeScrollOptions(defaults.scroll, definition.scroll);
    this.behavior = mergeStepBehavior(defaults.behavior, definition.behavior);
  }

  reset() {
    this.props.set(cloneProps(this.initialProps));
  }

  async resolveTarget(signal: AbortSignal) {
    return await resolveTargetElement(this.definition.target, signal);
  }

  snapshot() {
    return Object.freeze({
      initialProps: freezeProps(this.initialProps),
      currentProps: freezeProps(this.props.get()),
      target: this.target,
    });
  }
}
