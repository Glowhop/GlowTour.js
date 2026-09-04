import type {
  EventHandler,
  IndicatorOptions,
  OverlayOptions,
  PopoverOptions,
  PrimitiveValue,
  StartOptions,
  StepActionInstruction,
  StepBehavior,
  StepParameters,
  StepTransitionAction,
  TargetResolver,
} from "../types";

/** Recursively makes all properties readonly at any depth. */
export type DeepReadonly<T> = T extends (...arguments_: infer _Arguments) => infer _Return
  ? T
  : T extends readonly (infer TEntry)[]
    ? readonly DeepReadonly<TEntry>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;

/** Step properties (title, content, and optional display options) excluding target and behavior. */
export type StepProps<T> = Omit<StepParameters<T>, "target" | "resetPropsOnEnter" | "behavior">;

/** Immutable step properties. */
export type ReadonlyStepProps<T> = {
  readonly title: T;
  readonly content: T;
  readonly data?: Readonly<Record<string, PrimitiveValue>>;
  readonly overlay?: DeepReadonly<OverlayOptions>;
  readonly popover?: DeepReadonly<PopoverOptions>;
  readonly indicator?: DeepReadonly<IndicatorOptions>;
};

/** Immutable tour start options. */
export type ReadonlyStartOptions<T> = DeepReadonly<StartOptions<T>>;

/** A single step in a tour workflow (immutable). */
export interface WorkflowStepDefinition<T> {
  readonly target: TargetResolver;
  readonly resetPropsOnEnter?: boolean;
  readonly behavior?: DeepReadonly<StepBehavior>;
  readonly props: ReadonlyStepProps<T>;
  readonly actions: readonly StepActionInstruction<T>[];
  readonly eventHandlers: readonly EventHandler<T>[];
  readonly advanceAction: StepTransitionAction<T> | null;
  readonly previousAction: StepTransitionAction<T> | null;
  readonly cancelAction: StepTransitionAction<T> | null;
}

/** A complete tour workflow definition (immutable). */
export interface WorkflowDefinition<T> {
  readonly name: string;
  readonly options: ReadonlyStartOptions<T>;
  readonly steps: readonly WorkflowStepDefinition<T>[];
}
