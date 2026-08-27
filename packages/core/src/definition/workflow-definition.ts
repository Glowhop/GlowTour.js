import type {
  AnimationOptions,
  DynamicStepProps,
  EventHandler,
  StartOptions,
  StepActionInstruction,
  StepParameters,
  StepTransitionAction,
} from "../types";
import { cloneStepProps, freezeStepProps } from "./step-props";
import type { ReadonlyStartOptions, WorkflowDefinition, WorkflowStepDefinition } from "./types";

export interface WorkflowStepDraft<T> {
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
  previousAction: StepTransitionAction<T> | null;
  cancelAction: StepTransitionAction<T> | null;
}

function freezeRecord<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
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
      arrow: options.arrow && freezeRecord({ ...options.arrow }),
      buttons: options.buttons && freezeRecord({ ...options.buttons }),
      keyboardShortcuts:
        options.keyboardShortcuts &&
        freezeRecord({
          previous:
            options.keyboardShortcuts.previous &&
            freezeRecord([...options.keyboardShortcuts.previous]),
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

function freezeStep<T>(draft: WorkflowStepDraft<T>): WorkflowStepDefinition<T> {
  return freezeRecord({
    target: draft.target,
    props: freezeStepProps(draft.props),
    overlay: freezeOverlay(draft.overlay),
    popover: freezePopover(draft.popover),
    indicator: freezeIndicator(draft.indicator),
    scroll: draft.scroll && freezeRecord({ ...draft.scroll }),
    behavior: draft.behavior && freezeRecord({ ...draft.behavior }),
    actions: freezeRecord([...draft.actions]),
    eventHandlers: freezeRecord(draft.eventHandlers.map((handler) => freezeRecord({ ...handler }))),
    nextAction: draft.nextAction,
    previousAction: draft.previousAction,
    cancelAction: draft.cancelAction,
  });
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

export function cloneWorkflowStepDraft<T>(
  definition: WorkflowStepDefinition<T> | WorkflowStepDraft<T>,
): WorkflowStepDraft<T> {
  return {
    ...definition,
    props: cloneStepProps(definition.props),
    actions: [...definition.actions],
    eventHandlers: [...definition.eventHandlers],
  };
}

export function createWorkflowDefinition<T>(
  name: string,
  options: StartOptions,
  drafts: readonly WorkflowStepDraft<T>[],
): WorkflowDefinition<T> {
  return freezeRecord({
    name,
    options: freezeOptions(options),
    steps: freezeRecord(drafts.map(freezeStep)),
  });
}
