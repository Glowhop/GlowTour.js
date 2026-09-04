import type { WorkflowBuilder } from "../builder";
import type { ReadonlyStepProps, WorkflowDefinition } from "../definition";

export type {
  ReadonlyStartOptions,
  ReadonlyStepProps,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "../definition";

/** A primitive value that can be stored in step data or passed to callbacks. */
export type PrimitiveValue = string | number | boolean | null;

/**
 * Resolves the target element for a tour step.
 *
 * Can be a CSS selector string, an HTMLElement directly, or a function that resolves the target asynchronously.
 */
export type TargetResolver =
  | string
  | HTMLElement
  | ((context: TargetResolverContext) => HTMLElement | null | Promise<HTMLElement | null>);

/** Context passed to a target resolver function. */
export interface TargetResolverContext {
  /** Signal that aborts when the tour is cancelled or disposed. */
  signal: AbortSignal;
}

/** Configures step-level interaction behavior and error handling. */
export interface StepBehavior {
  /** Allow user interaction with the page outside the target element. @default false */
  allowInteraction?: boolean;
  /** Disable automatic focus on the target when the step is entered. @default false */
  disableAutoFocus?: boolean;
  /** Disable automatic scroll to the target when the step is entered. @default false */
  disableAutoScroll?: boolean;
  /** How to handle when the target is not found: `"wait"` waits and retries, `"skip"` advances to next step, `"error"` halts the tour. @default "error" */
  missingTargetStrategy?: "wait" | "skip" | "error";
  /** Scroll behavior options. */
  scroll?: ScrollOptions;
  /** Timeout in ms to wait for target to appear before applying missingTargetStrategy. @default 3000 */
  targetTimeout?: number;
  /**
   * Behavior when the dimmed overlay backdrop (outside the cutout around the
   * target) is clicked: `"advance"` moves to the next step, `"cancel"` ends
   * the tour, `"none"` ignores the click. Has no effect when
   * `allowInteraction` is `true`, since the page stays fully interactive and
   * there is no modal backdrop to click.
   * @default "none"
   */
  overlayClick?: "none" | "advance" | "cancel";
}

/** Placement directions for positioning the pointer or popover around the target. */
export type TryOrderOptions = "top" | "bottom" | "left" | "right";
/** A resolved placement direction, including `"center"` for centered positioning. */
export type ResolvedPlacement = TryOrderOptions | "center";

/** Base configuration for animated elements. */
export interface BaseOptions {
  /** Enable or disable animations. */
  animated?: boolean;
  /** Animation duration and easing options. */
  animation?: AnimationOptions;
}

/** Configures the pointer indicator that highlights the target element. */
export interface IndicatorOptions extends BaseOptions {
  /** Hide the indicator. @default false */
  disabled?: boolean;
  /** Gap between the target and the indicator in pixels. */
  gap?: number;
  /** Placement preference order when positioning the indicator. @default ["bottom", "top", "right", "left"] */
  placementTryOrder?: readonly TryOrderOptions[];
}

/** Configures the darkened overlay backdrop that highlights the target. */
export interface OverlayOptions extends BaseOptions {
  /** Color of the overlay backdrop (CSS color). @default "rgba(0, 0, 0, 0.5)" */
  color?: string;
  /** Opacity of the overlay (0-1). @default 0.5 */
  opacity?: number;
  /** Padding around the target cutout in pixels. @default 8 */
  padding?: number;
  /** Border radius of the target cutout in pixels. @default 4 */
  radius?: number;
}

/** Configures the arrow that points from the popover to the target. */
export interface PopoverArrowOptions {
  /** Hide the arrow. @default false */
  disabled?: boolean;
  /** Color of the arrow (CSS color). */
  color?: string;
  /** Size of the arrow in pixels. @default 8 */
  size?: number;
  /** Border width of the arrow in pixels. @default 0 */
  borderWidth?: number;
  /** Border radius of the arrow in pixels. @default 0 */
  borderRadius?: number;
  /** Gap between arrow tip and the target edge in pixels. @default 8 */
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

/** Configures the popover box that displays content for each step. */
export interface PopoverOptions extends BaseOptions {
  /** Placement preference order for the popover around the target. @default ["top", "bottom", "right", "left"] */
  placementTryOrder?: readonly TryOrderOptions[];
  /** Arrow configuration. */
  arrow?: PopoverArrowOptions;
  /** Hide the footer section. @default false */
  hideFooter?: boolean;
  /**
   * Disables only previous-button and previous-keyboard controls. Programmatic
   * navigation through the tour API and step context remains available.
   */
  disablePreviousButton?: boolean;
  /** Hide the previous button. @default false */
  hidePreviousButton?: boolean;
  /**
   * Disables only advance-button and advance-keyboard controls. Programmatic
   * navigation through the tour API and step context remains available.
   */
  disableAdvanceButton?: boolean;
  /** Hide the advance button. @default false */
  hideAdvanceButton?: boolean;
  /** Gap between the target and the popover in pixels. @default 16 */
  gap?: number;
  /** Keyboard shortcuts for navigation. */
  keyboardShortcuts?: {
    /**
     * Keys that trigger previous step. @default ["ArrowLeft", "Backspace"]
     */
    previous?: readonly string[];
    /**
     * Keys that trigger advance step. @default ["Enter", "ArrowRight"]
     */
    advance?: readonly string[];
    /**
     * Keys that trigger cancel. @default ["Escape"]
     */
    cancel?: readonly string[];
  };
}

/** Scroll behavior options passed to Element.scrollIntoView(). */
export interface ScrollOptions {
  /** Scroll animation. @default "auto" */
  behavior?: "auto" | "smooth";
  /** Vertical alignment of the target in the viewport. @default "center" */
  block?: "start" | "center" | "end" | "nearest";
  /** Horizontal alignment of the target in the viewport. @default "nearest" */
  inline?: "start" | "center" | "end" | "nearest";
}

/** Animation timing configuration. */
export interface AnimationOptions {
  /** Duration of the animation in milliseconds. */
  duration: number;
  /** CSS easing function (e.g., "ease-in-out", "cubic-bezier(...)"). */
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

/** Options for starting a tour workflow. */
export interface StartOptions<T> {
  /** Allow users to cancel the tour. @default true */
  cancellable?: boolean;
  /**
   * Locks page scroll while the tour is active, restoring it on finish,
   * cancel, error, or dispose.
   *
   * @default false
   */
  allowScroll?: boolean;
  /** Default overlay options for all steps. */
  overlay?: OverlayOptions;
  /** Default popover options for all steps. */
  popover?: PopoverOptions;
  /** Default indicator options for all steps. */
  indicator?: IndicatorOptions;
  /** Enable or disable animations globally. */
  animated?: boolean;
  /** Default step behavior for all steps. */
  behavior?: StepBehavior;

  /** Lifecycle hook called when the tour starts. */
  onStart?: (context: LifecycleHookContext<T>) => void | Promise<void>;
  /** Lifecycle hook called when the tour is cancelled. */
  onCancel?: (context: LifecycleHookContext<T>) => void | Promise<void>;
  /** Lifecycle hook called when the tour finishes. */
  onFinish?: (context: LifecycleHookContext<T>) => void | Promise<void>;
}

/** Update to step properties, either as a full replacement or via a function. */
export type StepPropsUpdate<T> =
  | ReadonlyStepProps<T>
  | ((current: ReadonlyStepProps<T>) => ReadonlyStepProps<T>);

/** Store for the current step's properties. */
export interface StepPropsStore<T> {
  /** Get the current step properties. */
  get(): ReadonlyStepProps<T>;
  /** Update the current step properties. */
  set(update: StepPropsUpdate<T>): void;
  /** Subscribe to changes in step properties. Returns an unsubscribe function. */
  subscribe(listener: (props: ReadonlyStepProps<T>) => void): () => void;
}
/** Context passed to step action callbacks. */
export interface StepContext<T> {
  /** Navigate to the next step. */
  advance(): Promise<void>;
  /** Cancel the tour. */
  cancel(): Promise<void>;
  /** Navigate to the previous step. */
  previous(): Promise<void>;
  /** The DOM element being highlighted for this step. */
  readonly target: HTMLElement;
  /** Store for reading and updating the current step's properties. */
  readonly props: StepPropsStore<T>;
  /** Signal that aborts when the step is exited or the tour is cancelled. */
  readonly signal: AbortSignal;
}

/** Context passed to transition hooks (beforeAdvance, beforePrevious, beforeCancel). */
export type BeforeActionStepContext<T> = Readonly<
  ReadonlyStepProps<T> & {
    readonly target: HTMLElement;
  }
>;

/** Context passed to target event handlers. */
export type StepEventContext<T> = StepContext<T>;

/** Options for the waitUntil step action. */
export interface WaitUntilOptions {
  /** Polling interval in milliseconds. @default 16 */
  interval?: number;
  /** Maximum time to wait in milliseconds before timing out. @default 3000 */
  timeout?: number;
}

/** Return value from a step action: `false` stops action sequence, otherwise continues. */
// biome-ignore lint/suspicious/noConfusingVoidType: `void` preserves the optional action result contract.
export type StepActionResult = boolean | void;

/** A callback that runs when the step is entered. */
export type StepAction<T> = (
  context: StepContext<T>,
) => Promise<StepActionResult> | StepActionResult;

/** A step action or a delay in milliseconds. */
export type StepActionInstruction<T> = StepAction<T> | number;

/** A callback that runs before transitioning to the next/previous step or cancelling. */
export type StepTransitionAction<T> = (context: BeforeActionStepContext<T>) => void | Promise<void>;

/** Handler for an event fired on the target element during a step. */
export interface EventHandler<TStepProps, TEvent extends Event = Event> {
  /** Event name(s) to listen for. */
  event: string;
  /** Callback invoked when the event fires. */
  callback: (event: TEvent, context: StepEventContext<TStepProps>) => void | Promise<void>;
}

/** Tour lifecycle status. */
export type TourStatus =
  | "idle"
  | "starting"
  | "transitioning"
  | "active"
  | "finished"
  | "cancelled"
  | "error"
  | "disposed";

/** Direction of tour navigation. */
export type TourDirection = "advance" | "previous";

/** Information about the currently active step in a tour. */
export interface TourCurrentStep<T> {
  /** The step properties as initially configured. */
  readonly initialProps: ReadonlyStepProps<T>;
  /** The current step properties (may have been updated via StepPropsStore). */
  readonly currentProps: ReadonlyStepProps<T>;
  /** The target element this step highlights, or null if not yet resolved. */
  readonly target: HTMLElement | null;
}

/** Complete state of an active tour. */
export interface TourState<T> {
  /** Name of the running workflow. */
  readonly name: string;
  /** Total number of steps in the workflow. */
  readonly totalSteps: number;
  /** Index of the currently active step (0-based), or -1 if no step is active. */
  readonly currentStepIndex: number;
  /** The currently active step, or null if the tour is not actively showing a step. */
  readonly currentStep: TourCurrentStep<T> | null;
  /** Direction of the last navigation ("advance" or "previous"). */
  readonly direction: TourDirection;
  /** Whether advancing to the next step is possible. */
  readonly canAdvance: boolean;
  /** Whether going to the previous step is possible. */
  readonly canPrevious: boolean;
  /** Whether the tour can be cancelled. */
  readonly canCancel: boolean;
  /** Whether the tour is on the first step. */
  readonly isFirstStep: boolean;
  /** Whether the tour is on the last step. */
  readonly isLastStep: boolean;
  /** Current status of the tour. */
  readonly status: TourStatus;
  /** Error encountered during the tour, if any. */
  readonly error: Error | null;
}

/** Observable store of the tour state. */
export interface ReadonlyTourState<T> {
  /** Get the current tour state. */
  get(): TourState<T>;
  /** Subscribe to tour state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: TourState<T>) => void): () => void;
}

/** The main tour controller that manages workflows and navigation. */
export interface GlowTour<T> {
  /** Create a new workflow builder with the given name. */
  create(name: string, options?: StartOptions<T>): WorkflowBuilder<T>;
  /** Run a workflow. */
  run(workflow: WorkflowDefinition<T>): Promise<void>;
  /** Advance to the next step. */
  advance(): Promise<void>;
  /** Go to the previous step. */
  previous(): Promise<void>;
  /** Jump to a specific step by index. */
  goToStep(index: number): Promise<void>;
  /** Cancel the current tour. */
  cancel(): Promise<void>;
  /** Dispose the tour and free resources. */
  dispose(): void;
  /** Observable store of the current tour state. */
  readonly state: ReadonlyTourState<T>;
}

/** Options for creating a GlowTour instance. */
export interface GlowTourOptions {
  /** Error handler for exceptions thrown in state subscribers. */
  onSubscriberError?: (error: Error) => void | Promise<void>;
}

/** Parameters for defining a tour step. */
export type StepParameters<T> = {
  /** The target element or selector for this step. */
  target: TargetResolver;
  /**
   * Reset step properties to initial values when entering this step.
   * @default true
   */
  resetPropsOnEnter?: boolean;
  /** Overlay options for this step (overrides workflow defaults). */
  overlay?: OverlayOptions;
  /** Popover options for this step (overrides workflow defaults). */
  popover?: PopoverOptions;
  /** Indicator options for this step (overrides workflow defaults). */
  indicator?: IndicatorOptions;
  /** Step behavior (overrides workflow defaults). */
  behavior?: StepBehavior;
  /** The title content for this step. */
  title: T;
  /** The body content for this step. */
  content: T;
  /** Arbitrary data associated with this step. */
  data?: Record<string, PrimitiveValue>;
};
