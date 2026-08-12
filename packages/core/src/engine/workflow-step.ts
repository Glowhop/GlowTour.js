import { Observable } from "@glowhop/observables";
import type { StepDefinition, DynamicStepProps, WorkflowStepPublicProps, StepConstructor } from "../types";
import { resolveTargetElement } from "../utils/utils";

export class WorkflowStep<T> {
  readonly target: StepDefinition<T>["target"];
  targetEl: HTMLElement | null;
  readonly actions: StepDefinition<T>["actions"];
  readonly eventHandlers: StepDefinition<T>["eventHandlers"];
  readonly nextAction: StepDefinition<T>["nextAction"];
  readonly backAction: StepDefinition<T>["backAction"];
  readonly cancelAction: StepDefinition<T>["cancelAction"];
  readonly props: Observable<StepDefinition<T>["presentation"]>;
  readonly initialProps: Readonly<StepDefinition<T>["presentation"]>;

  constructor(readonly definition: StepConstructor<T>) {
    this.target = definition.target;
    this.targetEl = null;
    this.actions = definition.actions;
    this.eventHandlers = definition.eventHandlers;
    this.nextAction = definition.nextAction;
    this.backAction = definition.backAction;
    this.cancelAction = definition.cancelAction;

    this.initialProps = Object.freeze({
      ...definition.presentation,
      data: definition.presentation.data ? { ...definition.presentation.data } : undefined,
    });

    const initialState: DynamicStepProps<T> = {
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    };
    this.props = new Observable<DynamicStepProps<T>>(initialState);
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
    if (!this.targetEl) {
      throw new Error(
        "Target element has not been resolved yet. use resolveTargetElement() before calling getElement().",
      );
    }
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
