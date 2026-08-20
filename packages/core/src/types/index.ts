import type { Observable } from "@glowhop/observables";
import type { Builder } from "../builder";
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
  | ((context: TargetResolutionContext) => HTMLElement | null | Promise<HTMLElement | null>);

export interface TargetResolutionContext {
  signal: AbortSignal;
}

export type WorkflowStatus =
  | "not-started"
  | "idle"
  | "starting"
  | "running"
  | "paused"
  | "finished"
  | "cancelled"
  | "error";

export type WorkflowDirection = "next" | "back";
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
    cancelLabel?: string;
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

export type StepPropsStore<T> = Observable<DynamicStepProps<T>>;
// biome-ignore lint/suspicious/noConfusingVoidType: `void` preserves the optional action result contract.
export type StepActionResult = boolean | void;

export type StepAction<T> = (
  element: HTMLElement | null,
  stepProps: StepPropsStore<T>,
) => Promise<StepActionResult> | StepActionResult;
export type StepActionInstruction<T> = StepAction<T> | number | "back" | "next";
export type StepTransitionAction<T> = (
  element: HTMLElement | null,
  stepProps: StepPropsStore<T>,
) => void | Promise<void>;

export interface EventHandler<TStepProps, TEvent extends Event = Event> {
  event: string;
  callback: (
    event: TEvent,
    stepProps: StepPropsStore<TStepProps>,
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

export interface GlowTour<T> {
  create(name: string, options?: StartOptions): Builder<T>;
  run(workflow: WorkflowDefinition<T>): Promise<void>;
  advance(): Promise<void>;
  previous(): Promise<void>;
  goToStep(index: number): Promise<void>;
  cancel(): Promise<void>;
  updateCurrentStep(update: (props: ReadonlyStepProps<T>) => DynamicStepProps<T>): void;
  dispose(): void;
  readonly state: {
    get(): TourState<T>;
    subscribe(listener: (state: TourState<T>) => void): () => void;
  };
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
  canGoNext: boolean;
  canGoBack: boolean;
  canCancel: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  status: WorkflowStatus;
  startOptions: StartOptions;
  error: Error | null;
}

export interface WorkflowControls<T> {
  start: (workflow?: WorkflowDefinition<T>) => Promise<void>;
  next: () => Promise<void>;
  back: () => Promise<void>;
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
