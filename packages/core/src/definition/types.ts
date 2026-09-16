import type {
  IndicatorOptions,
  OverlayOptions,
  PopoverOptions,
  PrimitiveValue,
  StartOptions,
  StepActionInstruction,
  StepBehavior,
  StepHookAction,
  StepParameters,
  TargetEventHandler,
  TargetResolver,
  TourClassNames,
} from "../types";

/** Recursively makes all properties readonly at any depth. */
export type DeepReadonly<T> = T extends (...arguments_: infer _Arguments) => infer _Return
  ? T
  : T extends readonly (infer TEntry)[]
    ? readonly DeepReadonly<TEntry>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;

/** Step properties (title, content, behavior, and optional display options) excluding id and target. */
export type StepProps<T> = Omit<StepParameters<T>, "id" | "target">;

/** Immutable step properties. */
export type ReadonlyStepProps<T> = {
  readonly title?: T;
  readonly content: T;
  readonly data?: Readonly<Record<string, PrimitiveValue>>;
  readonly overlay?: DeepReadonly<OverlayOptions>;
  readonly popover?: DeepReadonly<PopoverOptions>;
  readonly indicator?: DeepReadonly<IndicatorOptions>;
  readonly behavior?: DeepReadonly<StepBehavior>;
  readonly classNames?: DeepReadonly<TourClassNames>;
};

/** Immutable tour start options. */
export type ReadonlyStartOptions<T> = DeepReadonly<StartOptions<T>>;

/** A single step in a tour workflow (immutable). */
export interface WorkflowStepDefinition<T> {
  /** Stable identifier, unique within the workflow. */
  readonly id: string;
  readonly target: TargetResolver;
  readonly props: ReadonlyStepProps<T>;
  readonly actions: readonly StepActionInstruction<T>[];
  readonly targetEvents: readonly TargetEventHandler<T>[];
  readonly beforeEnter: StepHookAction<T> | null;
  readonly beforeLeave: StepHookAction<T> | null;
}

/** A complete tour workflow definition (immutable). */
export interface WorkflowDefinition<T> {
  readonly name: string;
  readonly options: ReadonlyStartOptions<T>;
  readonly steps: readonly WorkflowStepDefinition<T>[];
}
