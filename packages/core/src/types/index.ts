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

export interface StepBehavior {
  allowInteraction?: boolean;
  disableAutoFocus?: boolean;
  disableAutoScroll?: boolean;
  missingTargetStrategy?: "wait" | "skip" | "error";
  scroll?: ScrollOptions;
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
  /**
   * CSP nonce applied to the `<style>` element Glow Tour injects for the
   * arrow's pseudo-element rules. Required when the page's Content-Security-Policy
   * blocks unnonced inline styles.
   */
  styleNonce?: string;
  /**
   * Skip injecting the built-in arrow `<style>` element entirely. Provide the
   * equivalent rules yourself through whatever channel your CSP allows, such
   * as an external stylesheet.
   */
  disableAutoStyles?: boolean;
}

export interface PopoverOptions extends BaseOptions {
  placementTryOrder?: readonly TryOrderOptions[];
  arrow?: PopoverArrowOptions;
  hideFooter?: boolean;
  /**
   * Disables only previous-button and previous-keyboard controls. Programmatic
   * navigation through the tour API and step context remains available.
   */
  disablePreviousButton?: boolean;
  hidePreviousButton?: boolean;
  /**
   * Disables only advance-button and advance-keyboard controls. Programmatic
   * navigation through the tour API and step context remains available.
   */
  disableAdvanceButton?: boolean;
  hideAdvanceButton?: boolean;
  gap?: number;
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

export interface ScrollOptions {
  behavior?: "auto" | "smooth";
  block?: "start" | "center" | "end" | "nearest";
  inline?: "start" | "center" | "end" | "nearest";
}

export interface AnimationOptions {
  duration: number;
  easing: string;
}

/**
 * Context passed to a tour-level lifecycle hook (`onStart`, `onCancel`, `onFinish`).
 */
export interface LifecycleHookContext<T> {
  /**
   * The step associated with this lifecycle transition:
   * - `onStart`: the first step about to be entered (`workflow.steps[0]`), or
   *   `null` if the workflow has no steps.
   * - `onCancel`: the step the tour is currently on when cancellation is
   *   requested. Always non-null in practice, since a step is always active
   *   at the point a tour can be cancelled.
   * - `onFinish`: the last step the tour was on before finishing. Always
   *   non-null in practice, except for the edge case of a workflow with zero
   *   steps, which finishes immediately after `onStart` without ever
   *   entering a step.
   */
  readonly step: TourCurrentStep<T> | null;
  /**
   * Call this synchronously, or before the hook's returned promise resolves,
   * to prevent the lifecycle transition from completing:
   * - in `onStart`, the tour never starts: no step is entered (and, for a
   *   zero-step workflow, `onFinish` never fires either).
   * - in `onCancel`, the cancellation is prevented: the tour remains on its
   *   current step, un-cancelled.
   * - in `onFinish`, completion is prevented: the tour remains on its last
   *   step / current state, uncompleted.
   */
  abort(): void;
}

export interface StartOptions<T> {
  cancellable?: boolean;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  indicator?: IndicatorOptions;
  animated?: boolean;
  behavior?: StepBehavior;

  onStart?: (context: LifecycleHookContext<T>) => void | Promise<void>;
  onCancel?: (context: LifecycleHookContext<T>) => void | Promise<void>;
  onFinish?: (context: LifecycleHookContext<T>) => void | Promise<void>;
}

export type StepPropsUpdate<T> =
  | ReadonlyStepProps<T>
  | ((current: ReadonlyStepProps<T>) => ReadonlyStepProps<T>);

export interface StepPropsStore<T> {
  get(): ReadonlyStepProps<T>;
  set(update: StepPropsUpdate<T>): void;
  subscribe(listener: (props: ReadonlyStepProps<T>) => void): () => void;
}
export interface StepContext<T> {
  advance(): Promise<void>;
  cancel(): Promise<void>;
  previous(): Promise<void>;
  readonly target: HTMLElement;
  readonly props: StepPropsStore<T>;
  readonly signal: AbortSignal;
}

export type BeforeActionStepContext<T> = Readonly<
  ReadonlyStepProps<T> & {
    readonly target: HTMLElement;
  }
>;

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

export type StepActionInstruction<T> = StepAction<T> | number;

export type StepTransitionAction<T> = (context: BeforeActionStepContext<T>) => void | Promise<void>;

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
  | "error"
  | "disposed";

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
  create(name: string, options?: StartOptions<T>): WorkflowBuilder<T>;
  run(workflow: WorkflowDefinition<T>): Promise<void>;
  advance(): Promise<void>;
  previous(): Promise<void>;
  goToStep(index: number): Promise<void>;
  cancel(): Promise<void>;
  dispose(): void;
  readonly state: ReadonlyTourState<T>;
}

export interface GlowTourOptions {
  onSubscriberError?: (error: Error) => void | Promise<void>;
}

export type StepParameters<T> = {
  target: TargetResolver;
  /**
   * @default true
   */
  resetPropsOnEnter?: boolean;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  indicator?: IndicatorOptions;
  behavior?: StepBehavior;
  title: T;
  content: T;
  data?: Record<string, PrimitiveValue>;
};
