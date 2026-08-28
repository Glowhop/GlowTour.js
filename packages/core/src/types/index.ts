import type { Observable } from "@glowhop/observables";
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

export type WorkflowDirection = "advance" | "previous";
export type WorkflowStatus =
  | "not-started"
  | "idle"
  | "starting"
  | "running"
  | "paused"
  | "finished"
  | "cancelled"
  | "error";

export interface StepBehavior {
  allowInteraction?: boolean;
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

export interface PopoverArrowOptions {
  disabled?: boolean;
  color?: string;
  size?: number;
  borderWidth?: number;
  borderRadius?: number;
  edgePadding?: number;
}

export interface PopoverOptions extends BaseOptions {
  placementTryOrder?: readonly TryOrderOptions[];
  arrow?: PopoverArrowOptions;
  disableAutoFocus?: boolean;
  hideProgressIndicator?: boolean;
  gap?: number;
  buttons?: {
    previousLabel?: string;
    advanceLabel?: string;
    finishLabel?: string;
  };
  keyboardShortcuts?: {
    /**
     * @default ["ArrowLeft", "Backspace"]
     */
    previous?: readonly string[];
    /**
     * @default ["Enter", "ArrowRight"]
     */
    advance?: readonly string[];
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
  disablePreviousButton?: boolean;
  hidePreviousButton?: boolean;
  disableAdvanceButton?: boolean;
  hideAdvanceButton?: boolean;
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
export type StepPropsStore<T> = Observable<DynamicStepProps<T>>;
export interface StepContext<T> {
  advance(): Promise<void>;
  cancel(): Promise<void>;
  previous(): Promise<void>;
  readonly target: HTMLElement;
  readonly props: StepPropsStore<T>;
  readonly signal: AbortSignal;
}

export type StepEventContext<T> = StepContext<T>;

export interface WaitUntilOptions {
  /** @default 16 */
  interval?: number;
  /** @default 3000 */
  timeout?: number;
}

// biome-ignore lint/suspicious/noConfusingVoidType: `void` preserves the optional action result contract.
export type StepActionResult = boolean | void;

export type StepAction<T> = (
  context: StepContext<T>,
) => Promise<StepActionResult> | StepActionResult;

export type StepWaitPredicate<T> = (
  element: HTMLElement | null,
  stepState: ReadonlyStepState<T>,
) => Promise<boolean> | boolean;

export type StepActionInstruction<T> = StepAction<T> | number;

export type StepTransitionAction<T> = (context: StepContext<T>) => void | Promise<void>;

export interface EventHandler<TStepProps, TEvent extends Event = Event> {
  event: string;
  callback: (event: TEvent, context: StepEventContext<TStepProps>) => void | Promise<void>;
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
  dispose(): void;
  readonly state: ReadonlyTourState<T>;
}

export interface WorkflowStepPublicProps<T> {
  initialProps: Readonly<DynamicStepProps<T>>;
  currentProps: StepPropsStore<T>;
  target: HTMLElement | null;
}

export interface WorkflowState<T> {
  name: string;
  totalSteps: number;
  currentStepIndex: number;
  currentStep: WorkflowStepPublicProps<T> | null;
  direction: WorkflowDirection;
  canAdvance: boolean;
  canPrevious: boolean;
  canCancel: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  status: WorkflowStatus;
  startOptions: StartOptions;
  error: Error | null;
}

export interface WorkflowControls<T> {
  start: (workflow?: WorkflowDefinition<T>) => Promise<void>;
  advance: () => Promise<void>;
  previous: () => Promise<void>;
  cancel: () => Promise<void>;
  goTo: (index: number) => Promise<void>;
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
