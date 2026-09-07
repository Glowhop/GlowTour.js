import type {
  AnimationOptions,
  EventHandler,
  StartOptions,
  StepActionInstruction,
  StepParameters,
  StepTransitionAction,
} from "../types";
import { cloneStepProps, freezeStepProps } from "./step-props";
import type {
  ReadonlyStartOptions,
  StepProps,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "./types";

export interface WorkflowStepDraft<T> {
  id: string;
  target: StepParameters<T>["target"];
  resetPropsOnEnter?: boolean;
  props: StepProps<T>;
  behavior?: StepParameters<T>["behavior"];
  actions: StepActionInstruction<T>[];
  eventHandlers: EventHandler<T>[];
  advanceAction: StepTransitionAction<T> | null;
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
      keyboardShortcuts:
        options.keyboardShortcuts &&
        freezeRecord({
          previous:
            options.keyboardShortcuts.previous &&
            freezeRecord([...options.keyboardShortcuts.previous]),
          advance:
            options.keyboardShortcuts.advance &&
            freezeRecord([...options.keyboardShortcuts.advance]),
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
    id: draft.id,
    target: draft.target,
    resetPropsOnEnter: draft.resetPropsOnEnter,
    props: freezeStepProps(draft.props),
    behavior:
      draft.behavior &&
      freezeRecord({
        ...draft.behavior,
        scroll: draft.behavior.scroll && freezeRecord({ ...draft.behavior.scroll }),
      }),
    actions: freezeRecord(draft.actions.map((action) => action)),
    eventHandlers: freezeRecord(draft.eventHandlers.map((handler) => freezeRecord({ ...handler }))),
    advanceAction: draft.advanceAction,
    previousAction: draft.previousAction,
    cancelAction: draft.cancelAction,
  });
}

function freezeOptions<T>(options: StartOptions<T>): ReadonlyStartOptions<T> {
  return freezeRecord({
    ...options,
    overlay: freezeOverlay(options.overlay),
    popover: freezePopover(options.popover),
    indicator: freezeIndicator(options.indicator),
    behavior:
      options.behavior &&
      freezeRecord({
        ...options.behavior,
        scroll: options.behavior.scroll && freezeRecord({ ...options.behavior.scroll }),
      }),
  });
}

/**
 * Creates a mutable copy of a workflow step definition.
 * @param definition The step definition to clone.
 * @returns A mutable copy that can be further modified.
 */
export function cloneWorkflowStepDraft<T>(
  definition: WorkflowStepDefinition<T> | WorkflowStepDraft<T>,
): WorkflowStepDraft<T> {
  return {
    ...definition,
    props: cloneStepProps(definition.props),
    actions: definition.actions.map((action) => action),
    eventHandlers: [...definition.eventHandlers],
  };
}

/**
 * Validates that every step carries a non-empty id and that ids are unique.
 * Runs at construction time so a malformed workflow can never reach `run()`.
 */
function assertUniqueStepIds<T>(name: string, drafts: readonly WorkflowStepDraft<T>[]): void {
  const seen = new Map<string, number>();
  for (const [index, draft] of drafts.entries()) {
    const label = `step ${index}${draft.props.title ? ` ("${String(draft.props.title)}")` : ""}`;
    if (typeof draft.id !== "string" || draft.id.length === 0) {
      throw new Error(`Workflow "${name}": ${label} is missing a non-empty "id".`);
    }
    const duplicate = seen.get(draft.id);
    if (duplicate !== undefined) {
      throw new Error(
        `Workflow "${name}": ${label} reuses the id "${draft.id}" already used by step ${duplicate}. Step ids must be unique.`,
      );
    }
    seen.set(draft.id, index);
  }
}

/**
 * Creates a frozen workflow definition from a name, options, and step drafts.
 * @param name The workflow name.
 * @param options Tour start options and lifecycle hooks.
 * @param drafts The workflow steps.
 * @returns A frozen workflow definition ready to run.
 */
export function createWorkflowDefinition<T>(
  name: string,
  options: StartOptions<T>,
  drafts: readonly WorkflowStepDraft<T>[],
): WorkflowDefinition<T> {
  assertUniqueStepIds(name, drafts);
  return freezeRecord({
    name,
    options: freezeOptions(options),
    steps: freezeRecord(drafts.map(freezeStep)),
  });
}
