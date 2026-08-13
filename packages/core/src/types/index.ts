import type { Observable } from "@glowhop/observables";
import type { WorkflowStep } from "../engine/workflow-step";

export type PrimitiveValue = string | number | boolean | null;

export type TargetResolver =
  | string
  | HTMLElement
  | (() => HTMLElement | null)
  | (() => Promise<HTMLElement | null>);

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
  placementTryOrder?: TryOrderOptions[];
}

export interface OverlayOptions extends BaseOptions {
  color?: string;
  opacity?: number;
  padding?: number;
  radius?: number;
}

export interface PopoverOptions extends BaseOptions {
  placementTryOrder?: TryOrderOptions[];
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
    back?: string[];
    /**
     * @default ["Enter", "ArrowRight"]
     */
    next?: string[];
    /**
     * @default ["Escape"]
     */
    cancel?: string[];
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

  onStart?: () => void;
  onCancel?: () => void;
  onFinish?: () => void;
}

export type StepPropsStore<T> = Observable<DynamicStepProps<T>>;
export type StepActionResult = boolean | void;

export type StepAction<T> = (
  element: HTMLElement | null,
  stepProps: StepPropsStore<T>,
) => Promise<StepActionResult> | StepActionResult;
export type StepActionInstruction<T> = StepAction<T> | number | "back" | "next";
export type StepTransitionAction<T> = (
  element: HTMLElement | null,
  stepProps: StepPropsStore<T>,
) => void;

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

export interface WorkflowDefinition<T> {
  name: string;
  options: StartOptions;
  steps: WorkflowStep<T>[];
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
