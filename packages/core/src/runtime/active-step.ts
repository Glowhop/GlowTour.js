import {
  freezeStepProps,
  type ReadonlyStartOptions,
  type ReadonlyStepProps,
  type WorkflowStepDefinition,
} from "../definition";
import type { StepPropsStore, TourDirection } from "../types";
import { mergeStepProps } from "../utils/options";
import { resolveTargetElement } from "../utils/utils";
import { createStepPropsStore } from "./step-props-store";

export class ActiveStep<T> {
  readonly initialProps: ReadonlyStepProps<T>;
  readonly props: StepPropsStore<T>;
  readonly animated: boolean | undefined;
  readonly allowScroll: boolean;
  target: HTMLElement | null = null;
  /** The navigation that last brought the tour to this step. */
  direction: TourDirection = "advance";

  constructor(
    readonly definition: WorkflowStepDefinition<T>,
    defaults: ReadonlyStartOptions<T>,
    reportSubscriberError: (error: unknown) => void = () => {},
    readonly path = "steps[0]",
    private readonly rootDocument?: Document,
  ) {
    // The workflow options go in whole: freezeStepProps keeps only the step prop keys.
    this.initialProps = freezeStepProps(mergeStepProps(defaults, definition.props));
    this.props = createStepPropsStore(this.initialProps, reportSubscriberError, path);
    this.animated = defaults.animated;
    this.allowScroll = defaults.allowScroll !== false;
  }

  /** Reads `behavior.allowInteraction` live: `props.update({ behavior })` changes it while the step runs. */
  allowsInteraction() {
    return this.props.get().behavior?.allowInteraction === true;
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
      id: this.definition.id,
      initialProps: freezeStepProps(this.initialProps),
      currentProps: freezeStepProps(this.props.get()),
      target: this.target,
    });
  }
}
