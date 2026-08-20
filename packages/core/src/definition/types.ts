import type {
  DynamicStepProps,
  EventHandler,
  IndicatorOptions,
  OverlayOptions,
  PopoverOptions,
  PrimitiveValue,
  ScrollOptions,
  StartOptions,
  StepActionInstruction,
  StepBehavior,
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

export type ReadonlyStepProps<T> = Omit<Readonly<DynamicStepProps<T>>, "data"> & {
  readonly data?: Readonly<Record<string, PrimitiveValue>>;
};

export type ReadonlyStartOptions = DeepReadonly<StartOptions>;

export interface WorkflowStepDefinition<T> {
  readonly target: TargetResolver;
  readonly overlay?: DeepReadonly<OverlayOptions>;
  readonly popover?: DeepReadonly<PopoverOptions>;
  readonly indicator?: DeepReadonly<IndicatorOptions>;
  readonly scroll?: DeepReadonly<ScrollOptions>;
  readonly behavior?: DeepReadonly<StepBehavior>;
  readonly props: ReadonlyStepProps<T>;
  readonly actions: readonly StepActionInstruction<T>[];
  readonly eventHandlers: readonly EventHandler<T>[];
  readonly nextAction: StepTransitionAction<T> | null;
  readonly backAction: StepTransitionAction<T> | null;
  readonly cancelAction: StepTransitionAction<T> | null;
}

export interface WorkflowDefinition<T> {
  readonly name: string;
  readonly options: ReadonlyStartOptions;
  readonly steps: readonly WorkflowStepDefinition<T>[];
}
