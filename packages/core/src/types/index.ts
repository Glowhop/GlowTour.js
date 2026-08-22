import type { WorkflowBuilder } from "../builder";
import type { ReadonlyStepProps, WorkflowDefinition } from "../definition";

export type {
  ReadonlyStartOptions,
  ReadonlyStepProps,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "../definition";

export type PrimitiveValue = string | number | boolean | null;

export type TargetResolver =
  | string
  | HTMLElement
  | ((context: TargetResolverContext) => HTMLElement | null | Promise<HTMLElement | null>);

export interface TargetResolverContext {
  signal: AbortSignal;
}

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

export type GlowTourElementName =
  | "root"
  | "header"
  | "progress"
  | "content"
  | "footer"
  | "popover"
  | "pointer"
  | "back-trigger"
  | "next-trigger"
  | "overlay";

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface HighlightOptions {
  padding: number;
  radius: number;
  overlayColor: string;
  overlayOpacity: number;
  animate: boolean;
}

export interface HighlightStepOverrides extends Partial<HighlightOptions> {}

export interface WorkflowHighlightOptions extends Partial<HighlightOptions> {
  mountRoot?: HTMLElement | null;
}

export interface StepBehavior {
  allowInteraction?: boolean;
  targetTracking?: "events" | "continuous";
  missingTargetStrategy?: "wait" | "skip" | "error";
  targetTimeout?: number;
}

export type TryOrderOptions = "top" | "bottom" | "left" | "right";
export type ResolvedPlacement = TryOrderOptions | "center";

export interface BaseOptions {
  animated?: boolean;
  animation?: AnimationOptions;
}

export interface IndicatorOptions extends BaseOptions {
  disabled?: boolean;
  gap?: number;
  placementTryOrder?: readonly TryOrderOptions[];
}

export interface OverlayOptions extends BaseOptions {
  color?: string;
  opacity?: number;
  padding?: number;
  radius?: number;
}

export interface PopoverOptions extends BaseOptions {
  placementTryOrder?: readonly TryOrderOptions[];
  disableArrow?: boolean;
  disableAutoFocus?: boolean;
  hideProgressIndicator?: boolean;
  gap?: number;
  buttons?: {
    backLabel?: string;
    nextLabel?: string;
    finishLabel?: string;
  };
  keyboardShortcuts?: {
    /**
     * @default ["ArrowLeft", "Backspace"]
     */
    back?: readonly string[];
    /**
     * @default ["Enter", "ArrowRight"]
     */
    next?: readonly string[];
    /**
     * @default ["Escape"]
     */
    cancel?: readonly string[];
  };
}

export interface DynamicStepProps<T> {
  title: T;
  content: T;
  hideFooter?: boolean;
  disableBackButton?: boolean;
  hideBackButton?: boolean;
  disableNextButton?: boolean;
  hideNextButton?: boolean;
  disableAutoScroll?: boolean;
  /**
   * @default true
   */
  resetPropsOnEnter?: boolean;
  data?: Record<string, PrimitiveValue>;
}

export interface ScrollOptions {
  behavior?: "auto" | "smooth";
  block?: "start" | "center" | "end" | "nearest";
  inline?: "start" | "center" | "end" | "nearest";
}

export interface AnimationOptions {
  duration: number;
  easing: string;
}

export interface StartOptions {
  cancellable?: boolean;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  indicator?: IndicatorOptions;
  scroll?: ScrollOptions;
  animated?: boolean;
  behavior?: StepBehavior;

  onStart?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onFinish?: () => void | Promise<void>;
}

export interface ReadonlyStepState<T> {
  get(): ReadonlyStepProps<T>;
  subscribe(listener: (props: ReadonlyStepProps<T>) => void): () => void;
}
// biome-ignore lint/suspicious/noConfusingVoidType: `void` preserves the optional action result contract.
export type StepActionResult = boolean | void;

export type StepAction<T> = (
  element: HTMLElement | null,
  stepState: ReadonlyStepState<T>,
) => Promise<StepActionResult> | StepActionResult;
export type StepWaitPredicate<T> = (
  element: HTMLElement | null,
  stepState: ReadonlyStepState<T>,
) => Promise<boolean> | boolean;
export interface StepWaitInstruction<T> {
  readonly type: "waitFor";
  readonly predicate: StepWaitPredicate<T>;
  readonly timeout: number;
  readonly interval: number;
  readonly description: string;
}
export type StepActionInstruction<T> =
  | StepAction<T>
  | StepWaitInstruction<T>
  | number
  | "advance"
  | "previous";
export type StepTransitionAction<T> = (
  element: HTMLElement | null,
  stepState: ReadonlyStepState<T>,
) => void | Promise<void>;

export interface EventHandler<TStepProps, TEvent extends Event = Event> {
  event: string;
  callback: (
    event: TEvent,
    stepState: ReadonlyStepState<TStepProps>,
    next: () => Promise<void>,
    back: () => Promise<void>,
    cancel: () => Promise<void>,
  ) => void | Promise<void>;
}

export type TourStatus =
  | "idle"
  | "starting"
  | "transitioning"
  | "active"
  | "finished"
  | "cancelled"
  | "error";

export type TourDirection = "advance" | "previous";

export interface TourCurrentStep<T> {
  readonly initialProps: ReadonlyStepProps<T>;
  readonly currentProps: ReadonlyStepProps<T>;
  readonly target: HTMLElement | null;
}

export interface TourState<T> {
  readonly name: string;
  readonly totalSteps: number;
  readonly currentStepIndex: number;
  readonly currentStep: TourCurrentStep<T> | null;
  readonly direction: TourDirection;
  readonly canAdvance: boolean;
  readonly canPrevious: boolean;
  readonly canCancel: boolean;
  readonly isFirstStep: boolean;
  readonly isLastStep: boolean;
  readonly status: TourStatus;
  readonly error: Error | null;
}

export interface ReadonlyTourState<T> {
  get(): TourState<T>;
  subscribe(listener: (state: TourState<T>) => void): () => void;
}

export interface GlowTour<T> {
  create(name: string, options?: StartOptions): WorkflowBuilder<T>;
  run(workflow: WorkflowDefinition<T>): Promise<void>;
  advance(): Promise<void>;
  previous(): Promise<void>;
  goToStep(index: number): Promise<void>;
  cancel(): Promise<void>;
  updateCurrentStep(update: (props: ReadonlyStepProps<T>) => DynamicStepProps<T>): void;
  dispose(): void;
  readonly state: ReadonlyTourState<T>;
}

export interface StepConstructor<T> {
  target: TargetResolver;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  indicator?: IndicatorOptions;
  scroll?: ScrollOptions;
  behavior?: StepBehavior;
  props: DynamicStepProps<T>;
}

export type StepParameters<T> = DynamicStepProps<T> & Omit<StepConstructor<T>, "props">;
