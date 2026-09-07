import type { WorkflowDefinition } from "../definition";
import type {
  IndicatorOptions,
  LifecycleHookContext,
  OverlayOptions,
  PopoverOptions,
  PrimitiveValue,
  StepAction,
  StepBehavior,
  StepTransitionAction,
} from "../types";

/**
 * A tour-level lifecycle hook callback (`onStart`, `onCancel`, `onFinish`), generic over the
 * config's content type `T` (defaults to `string`, the untrusted-JSON case).
 *
 * There is no built-in (JSON-object) form for this slot: `LifecycleHookContext` carries no
 * `target` at all (only `step: TourCurrentStep<T> | null`), so none of the DOM-oriented
 * `BuiltinAction` variants (which all assume a `target`/`signal`) have a valid mapping here. A
 * lifecycle hook is therefore only expressible as a same-runtime JS function — never as plain
 * JSON.
 */
export type LifecycleActionRef<T = string> = (
  context: LifecycleHookContext<T>,
) => void | Promise<void>;

/**
 * One of the built-in action instructions, discriminated by `type`. Each variant maps 1:1 onto an
 * existing `WorkflowStepBuilder` verb and mirrors its options.
 *
 * There is no `waitUntil` variant: a `waitUntil` predicate is arbitrary logic and cannot be
 * expressed as JSON, and this format has no registry to reference one by id.
 * `{ type: "waitUntilElement" }` covers the common case of waiting for a condition — waiting for
 * an element to appear — without needing an arbitrary predicate.
 *
 * Not generic: a builtin action holds no content, so it carries no `T`.
 */
export type BuiltinAction =
  | { readonly type: "wait"; readonly ms: number }
  | {
      readonly type: "waitUntilElement";
      readonly selector: string;
      readonly interval?: number;
      readonly timeout?: number;
    }
  | { readonly type: "clickTarget" }
  | { readonly type: "focusTarget" };

/**
 * A reference to a step action, resolved at build time by discriminating on its runtime shape:
 * - `typeof ref === "function"` -> used inline as-is (JS escape hatch, not serializable).
 * - a plain object with a `type` field -> a {@link BuiltinAction}, mapped onto the matching
 *   builder verb.
 * - anything else is a validation error.
 *
 * Used for `actions[]` and `eventHandlers[].action`, which both run against a full `StepContext`
 * (`target`, `signal`, navigation methods) — the same context `BuiltinAction`'s verbs assume, so
 * builtins are valid here.
 */
export type StepActionRef<T = string> = BuiltinAction | StepAction<T>;

/**
 * A reference to a transition hook (`advanceAction`/`previousAction`/`cancelAction`).
 *
 * `BeforeActionStepContext` has a `target` but no `signal`/navigation methods, which the
 * `BuiltinAction` verbs (`wait`, `waitUntilElement`, `clickTarget`, `focusTarget`) all need — none
 * of them can run in this slot. With no registry to fall back on, a transition hook is therefore
 * only expressible as a same-runtime JS function, never as plain JSON. This is a plain function
 * type (not a union) precisely because there is nothing else valid to put here.
 */
export type TransitionActionRef<T = string> = StepTransitionAction<T>;

/** JSON config form of a single `onTargetEvent` registration. */
export interface EventHandlerConfig<T = string> {
  /** Event name, or multiple event names sharing the same action. */
  readonly event: string | readonly string[];
  readonly action: StepActionRef<T>;
}

/**
 * JSON config form of a single tour step.
 *
 * Generic over `T`, the type of `title`/`content`. Defaults to `string` for the untrusted-JSON
 * path (`JSON.parse()` output); callers building same-runtime configs can instantiate with their
 * framework's content type (e.g. `StepConfig<ReactNode>`) to pass rich content straight through.
 */
export interface StepConfig<T = string> {
  /** Stable identifier for this step, unique within the workflow. Required. */
  readonly id: string;
  /** CSS selector for the step's target. Functions and `HTMLElement` are not supported in config form. */
  readonly target: string;
  readonly resetPropsOnEnter?: boolean;
  readonly overlay?: OverlayOptions;
  readonly popover?: PopoverOptions;
  readonly indicator?: IndicatorOptions;
  readonly behavior?: StepBehavior;
  readonly title: T;
  readonly content: T;
  readonly data?: Record<string, PrimitiveValue>;
  readonly actions?: readonly StepActionRef<T>[];
  readonly eventHandlers?: readonly EventHandlerConfig<T>[];
  readonly advanceAction?: TransitionActionRef<T>;
  readonly previousAction?: TransitionActionRef<T>;
  readonly cancelAction?: TransitionActionRef<T>;
}

/**
 * A complete, JSON-serializable tour definition.
 *
 * Generic over `T` (defaults to `string`) so the same format covers both the untrusted-JSON path
 * and same-runtime configs carrying framework content (`ReactNode`, `VNode`, `JSX.Element`, ...).
 */
export interface WorkflowConfig<T = string> {
  readonly name: string;
  readonly cancellable?: boolean;
  readonly allowScroll?: boolean;
  readonly overlay?: OverlayOptions;
  readonly popover?: PopoverOptions;
  readonly indicator?: IndicatorOptions;
  readonly animated?: boolean;
  readonly behavior?: StepBehavior;
  readonly onStart?: LifecycleActionRef<T>;
  readonly onCancel?: LifecycleActionRef<T>;
  readonly onFinish?: LifecycleActionRef<T>;
  readonly steps: readonly StepConfig<T>[];
}

/** A single validation failure, with a path pointing at the offending config field. */
export interface ConfigValidationIssue {
  /** Path into the config, e.g. `steps[2].eventHandlers[0].action`. */
  readonly path: string;
  readonly message: string;
}

/**
 * Aggregate error thrown when a `WorkflowConfig` fails validation.
 *
 * Carries every issue found in a single pass over the whole config (decision: fail-fast on the
 * first problem would force multiple edit/re-run cycles for a hand-written or generated JSON
 * document), rather than throwing on the first issue encountered.
 */
export class ConfigValidationError extends Error {
  readonly issues: readonly ConfigValidationIssue[];

  constructor(issues: readonly ConfigValidationIssue[]) {
    const summary = issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join("\n");
    super(`Invalid workflow config (${issues.length} issue(s)):\n${summary}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

/**
 * The `WorkflowDefinition` produced from a `WorkflowConfig<T>`, with the original (frozen) config
 * attached so a future JSON exporter can round-trip cheaply without re-deriving it from the built
 * definition.
 */
export interface WorkflowDefinitionFromConfig<T = string> extends WorkflowDefinition<T> {
  readonly source: Readonly<WorkflowConfig<T>>;
}
