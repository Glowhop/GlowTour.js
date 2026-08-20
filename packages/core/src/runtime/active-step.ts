import { Observable } from "@glowhop/observables";
import {
  cloneStepProps,
  freezeStepProps,
  type ReadonlyStartOptions,
  type ReadonlyStepProps,
  type WorkflowStepDefinition,
} from "../definition";
import type { DynamicStepProps } from "../types";
import {
  mergeIndicatorOptions,
  mergeOverlayOptions,
  mergePopoverOptions,
  mergeScrollOptions,
  mergeStepBehavior,
} from "../utils/options";
import { resolveTargetElement } from "../utils/utils";

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
    this.initialProps = freezeStepProps(definition.props);
    this.props = new Observable(cloneStepProps(this.initialProps));
    this.overlay = mergeOverlayOptions(defaults.overlay, definition.overlay);
    this.popover = mergePopoverOptions(defaults.popover, definition.popover);
    this.indicator = mergeIndicatorOptions(defaults.indicator, definition.indicator);
    this.scroll = mergeScrollOptions(defaults.scroll, definition.scroll);
    this.behavior = mergeStepBehavior(defaults.behavior, definition.behavior);
  }

  reset() {
    this.props.set(cloneStepProps(this.initialProps));
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
