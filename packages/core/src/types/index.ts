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
  /** Allow user interaction with the target: the page is no longer inert and pointer events reach the target through the cutout, while the dimmed area still catches clicks. Change it during the step with `context.props.update({ behavior: { allowInteraction } })`. @default false */
  allowInteraction?: boolean;
  /** Move focus into the popover when the step is shown. @default true */
  autoFocus?: boolean;
  /** Scroll the target into view when the step is entered. @default true */
  autoScroll?: boolean;
  /** Keyboard shortcuts for navigation while the step is shown. */
  keyboard?: KeyboardShortcuts;
  /** What the step does when its target cannot be found. */
  missingTarget?: MissingTargetOptions;
  /** Scroll behavior options. */
  scroll?: ScrollOptions;
  /**
   * Behavior when the dimmed overlay backdrop (outside the cutout around the
   * target) is clicked: `"advance"` moves to the next step, `"cancel"` ends
   * the tour, `"none"` ignores the click. Has no effect when
   * `allowInteraction` is `true`: clicks on the dimmed area are then ignored.
   * @default "none"
   */
  overlayClick?: "none" | "advance" | "cancel";
}

/** Keys that navigate the tour while a step is shown. */
export interface KeyboardShortcuts {
  /** Keys that go to the previous step. @default ["ArrowLeft", "Backspace"] */
  previous?: readonly string[];
  /** Keys that advance to the next step. @default ["Enter", "ArrowRight"] */
  advance?: readonly string[];
  /** Keys that cancel the tour. @default ["Escape"] */
  cancel?: readonly string[];
}

/** How a step handles a target that cannot be found. */
export interface MissingTargetOptions {
  /**
   * `"wait"` retries until `timeout`, `"skip"` moves past the step, `"error"` fails the tour,
   * `"detached"` shows the popover centered in the viewport over a backdrop that covers the whole
   * screen. A detached step has no pointer and no cutout, does not scroll, keeps the page blocked
   * even when `allowInteraction` is `true`, and binds no `targetEvents`; its `context.target` is the
   * document's `<body>`.
   * @default "error"
   */
  strategy?: "wait" | "skip" | "error" | "detached";
  /** How long to look for the target with the `"wait"` strategy, in milliseconds. @default 3000 */
  timeout?: number;
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
  /** Hide the indicator. It only shows on steps that allow interaction. @default false */
  hidden?: boolean;
  /** Gap between the target and the indicator in pixels. */
  gap?: number;
  /** Placement preference order when positioning the indicator. @default ["left", "right", "top", "bottom"] */
  placementTryOrder?: readonly TryOrderOptions[];
}

/** Configures the darkened overlay backdrop that highlights the target. */
export interface OverlayOptions extends BaseOptions {
  /** Color of the overlay backdrop (CSS color). Falls back to the `--glow-tour-overlay-color` theme variable when unset. */
  color?: string;
  /** Opacity of the overlay (0-1). @default 0.7 */
  opacity?: number;
  /** Padding around the target cutout in pixels. @default 8 */
  padding?: number;
  /** Border radius of the target cutout in pixels. @default 8 */
  radius?: number;
}

/** Configures the arrow that points from the popover to the target. */
export interface PopoverArrowOptions {
  /** Hide the arrow. @default false */
  hidden?: boolean;
  /** Color of the arrow (CSS color). */
  color?: string;
  /** Size of the arrow in pixels. @default 12 */
  size?: number;
  /** Border width of the arrow in pixels. Falls back to the `--glow-tour-arrow-border-width` theme variable (`1px`) when unset. */
  borderWidth?: number;
  /** Border radius of the arrow in pixels. @default 0 */
  borderRadius?: number;
  /** Minimum gap the arrow keeps from the popover edges, in pixels. A placement whose arrow would fall inside this margin is rejected in favour of the next one. @default 16 */
  edgePadding?: number;
  /**
   * CSP nonce applied to the `<style>` element GlowTour.js injects for the
   * arrow's pseudo-element rules. Required when the page's Content-Security-Policy
   * blocks unnonced inline styles.
   */
  styleNonce?: string;
  /**
   * Inject the built-in arrow `<style>` element. Set `false` to provide the
   * equivalent rules yourself through whatever channel your CSP allows, such
   * as an external stylesheet.
   * @default true
   */
  autoStyles?: boolean;
}

/**
 * Display state of a popover control. `"visible"` is the default. New states may be added in a
 * minor version.
 */
export type TourControlState = "visible" | "hidden" | "disabled";

/** Display state of each popover control. */
export interface PopoverControls {
  /** The advance button. @default "visible" */
  advance?: TourControlState;
  /** The previous button. @default "visible" */
  previous?: TourControlState;
  /** The cancel button, never shown when the tour is not cancellable. @default "visible" */
  cancel?: TourControlState;
}

/** Configures the popover box that displays content for each step. */
export interface PopoverOptions extends BaseOptions {
  /** Placement preference order for the popover around the target. @default ["bottom", "top", "right", "left"] */
  placementTryOrder?: readonly TryOrderOptions[];
  /** Arrow configuration. */
  arrow?: PopoverArrowOptions;
  /**
   * Display state of the advance, previous and cancel controls. `"hidden"` removes a button and
   * `"disabled"` disables it; both also block its keyboard shortcut and `overlayClick`. Navigation
   * through the tour API and the step context stays available.
   */
  controls?: PopoverControls;
  /** Gap between the target and the popover in pixels. @default 16 */
  gap?: number;
}

/**
 * Scroll behavior options passed to Element.scrollIntoView().
 *
 * A step scrolls only when part of its target falls outside the viewport, and
 * does not wait for the scroll before presenting: the spotlight appears at once
 * and tracks the target as the page travels, and the popover and pointer enter
 * when the page has come to rest.
 */
export interface ScrollOptions {
  /** Scroll animation. Forced to `"instant"` when the user prefers reduced motion. @default "smooth" */
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
   * - `onStart`: the step `run()` starts on (the `startAt` step, or the first
   *   step), or `null` if the workflow has no steps.
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
   * Leaves page scroll available while the tour is active. Set `false` to lock
   * scroll instead, restoring it on finish, cancel, error, or dispose.
   *
   * @default true
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

  /**
   * Monitoring callback for this workflow. See `TourEvent`.
   *
   * Monitoring only: it cannot abort a transition — that is what the `onStart` /
   * `onCancel` / `onFinish` hooks and their `abort()` are for.
   */
  onEvent?: TourEventListener;
}

/** Update to step properties, either as a full replacement or via a function. */
export type StepPropsUpdate<T> =
  | ReadonlyStepProps<T>
  | ((current: ReadonlyStepProps<T>) => ReadonlyStepProps<T>);

/**
 * Partial change to step properties, for `StepPropsStore.update`. Fields it leaves out are kept.
 * `data` is merged key by key; `overlay`, `popover` and `indicator` are merged the way step options
 * merge over workflow defaults; arrays such as `placementTryOrder` are replaced.
 */
export type StepPropsPatch<T> = Partial<ReadonlyStepProps<T>>;

/** Store for the current step's properties. */
export interface StepPropsStore<T> {
  /** Get the current step properties. */
  get(): ReadonlyStepProps<T>;
  /** Replace the current step properties. */
  set(update: StepPropsUpdate<T>): void;
  /** Merge a partial change into the current step properties. See `StepPropsPatch`. */
  update(patch: StepPropsPatch<T> | ((current: ReadonlyStepProps<T>) => StepPropsPatch<T>)): void;
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
  /**
   * Navigate to the step with this id, skipping the steps in between. Stops the remaining actions
   * of this step, like `advance()`. Throws when no step has this id.
   */
  goTo(id: string): Promise<void>;
  /**
   * The direction of the navigation that entered this step. Captured when the context is created, so
   * it does not change while the step's callbacks run.
   */
  readonly direction: TourDirection;
  /** The step properties as initially configured, before any `props.set()`. */
  readonly initialProps: ReadonlyStepProps<T>;
  /** The DOM element being highlighted for this step. */
  readonly target: HTMLElement;
  /** Store for reading and updating the current step's properties. */
  readonly props: StepPropsStore<T>;
  /** Signal that aborts when the step is exited or the tour is cancelled. */
  readonly signal: AbortSignal;
}

/**
 * Context passed to the `beforeEnter` and `beforeLeave` step hooks. It has no navigation methods:
 * a transition is already in progress when these hooks run. `direction` is the direction of that
 * navigation, so the step being left and the step being entered see the same value.
 */
export interface StepHookContext<T>
  extends Omit<StepContext<T>, "advance" | "cancel" | "goTo" | "previous"> {
  /**
   * Call it synchronously, or before the hook's returned promise resolves, to stop the navigation.
   * The tour stays on the step it was on and emits nothing: `beforeLeave` keeps the step, and
   * `beforeEnter` does not show the next one. When `beforeEnter` aborts the first step of `run()`,
   * the tour goes back to `idle`, like an `onStart` abort.
   */
  abort(): void;
}

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

/** A callback that runs before a step is entered or left (`beforeEnter` / `beforeLeave`). */
export type StepHookAction<T> = (context: StepHookContext<T>) => void | Promise<void>;

/** Handler for an event fired on the target element during a step. */
export interface TargetEventHandler<TStepProps, TEvent extends Event = Event> {
  /** Event name(s) to listen for. */
  event: string;
  /** Callback invoked when the event fires. */
  callback: (event: TEvent, context: StepEventContext<TStepProps>) => void | Promise<void>;
}

/** Tour lifecycle status. New statuses may be added in a minor release: keep a default branch when switching over it. */
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
  /** The stable identifier of this step, as declared in the workflow. */
  readonly id: string;
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
  /** Run a workflow, optionally starting at a specific step. */
  run(workflow: WorkflowDefinition<T>, options?: RunOptions): Promise<void>;
  /** Advance to the next step. */
  advance(): Promise<void>;
  /** Go to the previous step. */
  previous(): Promise<void>;
  /**
   * Go to the step with this id, skipping the steps in between. Does nothing while a transition is
   * in progress or when that step is already shown. Throws when no step has this id.
   */
  goTo(id: string): Promise<void>;
  /** Cancel the current tour. */
  cancel(): Promise<void>;
  /** Dispose the tour and free resources. */
  dispose(): void;
  /** Observable store of the current tour state. */
  readonly state: ReadonlyTourState<T>;
}

/**
 * Per-run options. Unlike `StartOptions`, these belong to one `run()` call and
 * are never baked into the reusable workflow definition.
 */
export interface RunOptions {
  /**
   * Id of the step to start on, instead of the first one. Use it to resume a
   * tour where the user left off.
   *
   * The workflow itself is not truncated: `previous()` can still go back before
   * this step, and `totalSteps` is unchanged.
   *
   * Throws if no step carries this id — a tour that silently restarts from the
   * beginning is a bug the end user sees.
   */
  startAt?: string;
}

/**
 * What triggered a transition.
 *
 * `"api"` covers every call your own code makes: `advance()`, `previous()`,
 * `goTo()`, `cancel()`, and the same methods on the context of a step action.
 * The other three are the user acting on the tour UI directly.
 *
 * New sources may be added in a minor release: keep a default branch when switching over it.
 */
export type TourEventSource = "api" | "trigger" | "keyboard" | "overlay";

/** Name of a monitoring event. New events may be added in a minor release: keep a default branch when switching over it. */
export type TourEventType =
  | "tour:start"
  | "step:enter"
  | "step:leave"
  | "step:skip"
  | "tour:complete"
  | "tour:cancel"
  | "tour:error";

/**
 * A monitoring event, as handed to `onEvent`.
 *
 * This is a stable, public contract: the names and the fields below are meant to
 * be written straight into an analytics payload.
 */
export interface TourEvent {
  /** Which event this is. */
  readonly type: TourEventType;
  /** Name of the running workflow, as passed to `create()`. */
  readonly workflowName: string;
  /**
   * Id of the step the event is about, or `null` when no step applies — a
   * workflow with no steps, or a tour that failed before entering one.
   */
  readonly stepId: string | null;
  /** Index of that step (0-based), or `-1` when `stepId` is `null`. */
  readonly stepIndex: number;
  /** Total number of steps in the workflow. */
  readonly stepCount: number;
  /** Direction of the navigation that led here. */
  readonly direction: TourDirection;
  /** What triggered the transition — a button, the keyboard, the overlay, or your code. */
  readonly source: TourEventSource;
  /** `Date.now()` when the event was emitted. */
  readonly timestamp: number;
  /**
   * How long the thing this event names had been running, in milliseconds.
   *
   * For `step:leave`, the time spent on that step. For `tour:complete`,
   * `tour:cancel` and `tour:error`, the time since `run()` was called. For
   * `tour:start` and `step:enter` — the beginnings — always `0`.
   */
  readonly durationMs: number;
  /**
   * The error that ended the tour. Only ever set on `tour:error`.
   */
  readonly error: Error | null;
}

/**
 * Monitoring callback. Receives every event of a running tour.
 *
 * Monitoring only: unlike the lifecycle hooks, it cannot abort or delay a
 * transition. It is called synchronously and its return value is ignored; if it
 * throws, the error goes to `onSubscriberError` and the tour carries on.
 */
export type TourEventListener = (event: TourEvent) => void;

/** Options for creating a GlowTour instance. */
export interface GlowTourOptions {
  /** Error handler for exceptions thrown in state subscribers. */
  onSubscriberError?: (error: Error) => void | Promise<void>;
  /**
   * Monitoring callback for every tour this instance runs. Use it to wire the
   * tour to analytics once, rather than per workflow.
   *
   * A workflow can add its own listener through `StartOptions.onEvent`; both are
   * called, this one first.
   */
  onEvent?: TourEventListener;
}

/** Parameters for defining a tour step. */
export type StepParameters<T> = {
  /**
   * Stable identifier for this step, unique within the workflow.
   *
   * Required: it is the only durable way to designate a step across reloads
   * and navigations (see `RunOptions.startAt`). A positional index is not a
   * substitute — it breaks as soon as steps are reordered or inserted.
   */
  id: string;
  /** The target element or selector for this step. */
  target: TargetResolver;
  /** Overlay options for this step (overrides workflow defaults). */
  overlay?: OverlayOptions;
  /** Popover options for this step (overrides workflow defaults). */
  popover?: PopoverOptions;
  /** Indicator options for this step (overrides workflow defaults). */
  indicator?: IndicatorOptions;
  /** Step behavior (overrides workflow defaults). */
  behavior?: StepBehavior;
  /** The title content for this step. Without a title, the popover is named by its content. */
  title?: T;
  /** The body content for this step. */
  content: T;
  /** Arbitrary data associated with this step. */
  data?: Record<string, PrimitiveValue>;
};
