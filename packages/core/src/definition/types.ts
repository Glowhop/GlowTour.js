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

export type DeepReadonly<T> = T extends (...arguments_: infer _Arguments) => infer _Return
  ? T
  : T extends readonly (infer TEntry)[]
    ? readonly DeepReadonly<TEntry>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;

export type StepProps<T> = Omit<StepParameters<T>, "target" | "resetPropsOnEnter" | "behavior">;

export type ReadonlyStepProps<T> = {
  readonly title: T;
  readonly content: T;
  readonly data?: Readonly<Record<string, PrimitiveValue>>;
  readonly overlay?: DeepReadonly<OverlayOptions>;
  readonly popover?: DeepReadonly<PopoverOptions>;
  readonly indicator?: DeepReadonly<IndicatorOptions>;
};

export type ReadonlyStartOptions<T> = DeepReadonly<StartOptions<T>>;

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

export interface WorkflowDefinition<T> {
  readonly name: string;
  readonly options: ReadonlyStartOptions<T>;
  readonly steps: readonly WorkflowStepDefinition<T>[];
}
