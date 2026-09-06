import { WorkflowBuilder, type WorkflowStepBuilder } from "../builder";
import { abortableDelay } from "../runtime/abort";
import type { StepAction } from "../types";
import type {
  BuiltinAction,
  EventHandlerConfig,
  StepActionRef,
  StepConfig,
  WorkflowDefinitionFromConfig,
} from "./types";
import { type ValidateWorkflowConfigOptions, validateWorkflowConfig } from "./validate";

/** Options accepted by `createWorkflowFromConfig`. */
export type CreateWorkflowFromConfigOptions = ValidateWorkflowConfigOptions;

/**
 * Builds a `WorkflowDefinition<T>` from a JSON-serializable `WorkflowConfig<T>`. Defaults to
 * `T = string`, the untrusted-JSON case; instantiate with a framework content type (e.g.
 * `createWorkflowFromConfig<ReactNode>(...)`) for a same-runtime config carrying rich content.
 *
 * Validates the whole config first (structure, strict unknown-key rejection, and slot-appropriate
 * action shapes), collecting all issues into a single `ConfigValidationError` rather than failing
 * on the first one, then drives the existing `WorkflowBuilder<T>` to produce the definition.
 *
 * By default `title`/`content` must be plain strings, regardless of `T`, since the runtime cannot
 * otherwise know what `T` is. Pass `options.validateContent` to accept a richer `T`.
 *
 * The returned definition carries the original (frozen) config as `.source`, so a future JSON
 * exporter can round-trip without re-deriving the config from the built definition.
 *
 * @param config The parsed JSON (or equivalent plain object) to build from. Accepts `unknown` so
 *   callers can pass `JSON.parse(...)` output directly; it is validated and narrowed internally.
 * @param options Options; see {@link CreateWorkflowFromConfigOptions}.
 * @throws {ConfigValidationError} When the config is invalid.
 * @returns A frozen `WorkflowDefinition<T>` with `.source` attached.
 */
export function createWorkflowFromConfig<T = string>(
  config: unknown,
  options: CreateWorkflowFromConfigOptions = {},
): WorkflowDefinitionFromConfig<T> {
  const validated = validateWorkflowConfig<T>(config, options);

  const builder = new WorkflowBuilder<T>(validated.name, {
    cancellable: validated.cancellable,
    allowScroll: validated.allowScroll,
    overlay: validated.overlay,
    popover: validated.popover,
    indicator: validated.indicator,
    animated: validated.animated,
    behavior: validated.behavior,
    onStart: validated.onStart,
    onCancel: validated.onCancel,
    onFinish: validated.onFinish,
  });

  for (const [index, stepConfig] of validated.steps.entries()) {
    applyStepConfig(builder, stepConfig, `steps[${index}]`);
  }

  const definition = builder.build();
  return Object.freeze({ ...definition, source: deepFreezeClone(validated) });
}

/**
 * Applies a single `StepConfig` to a `WorkflowBuilder`: the `.step()` call itself, then actions,
 * event handlers, and transition hooks.
 * @param builder The workflow builder to add the step to.
 * @param stepConfig The config-form step to apply.
 * @param path Error path for this step, e.g. `steps[2]`.
 */
function applyStepConfig<T>(
  builder: WorkflowBuilder<T>,
  stepConfig: StepConfig<T>,
  path: string,
): void {
  const step = builder.step({
    target: stepConfig.target,
    resetPropsOnEnter: stepConfig.resetPropsOnEnter,
    overlay: stepConfig.overlay,
    popover: stepConfig.popover,
    indicator: stepConfig.indicator,
    behavior: stepConfig.behavior,
    title: stepConfig.title,
    content: stepConfig.content,
    data: stepConfig.data,
  });

  for (const [index, actionRef] of (stepConfig.actions ?? []).entries()) {
    applyStepActionRef(step, actionRef, `${path}.actions[${index}]`);
  }

  for (const [index, handler] of (stepConfig.eventHandlers ?? []).entries()) {
    applyEventHandler(step, handler, `${path}.eventHandlers[${index}]`);
  }

  if (stepConfig.advanceAction) step.beforeAdvance(stepConfig.advanceAction);
  if (stepConfig.previousAction) step.beforePrevious(stepConfig.previousAction);
  if (stepConfig.cancelAction) step.beforeCancel(stepConfig.cancelAction);
}

/**
 * Applies a `StepActionRef` for an `actions[]` entry directly to the step builder: an inline
 * function goes through `.do()`, and a `BuiltinAction` goes through the specific builder verb it
 * mirrors (so behavior — e.g. `.wait()`'s argument validation — matches the builder exactly rather
 * than being reimplemented here).
 * @param step The step builder to apply the action to.
 * @param ref The action ref to apply.
 * @param path Error path for this ref, used in the (should-be-unreachable, since `validate.ts`
 *   already checked this) internal error thrown for an unrecognized builtin type.
 */
function applyStepActionRef<T>(
  step: WorkflowStepBuilder<T>,
  ref: StepActionRef<T>,
  path: string,
): void {
  if (typeof ref === "function") {
    step.do(ref);
    return;
  }
  applyBuiltinAction(step, ref, path);
}

function applyBuiltinAction<T>(
  step: WorkflowStepBuilder<T>,
  builtin: BuiltinAction,
  path: string,
): void {
  switch (builtin.type) {
    case "wait":
      step.wait(builtin.ms);
      return;
    case "waitUntilElement":
      step.waitUntilElement(builtin.selector, {
        interval: builtin.interval,
        timeout: builtin.timeout,
      });
      return;
    case "clickTarget":
      step.clickTarget();
      return;
    case "focusTarget":
      step.focusTarget();
      return;
    default:
      throw new Error(`Unknown built-in action type at ${path}`);
  }
}

/**
 * Resolves the `event`/`action` pair of an `EventHandlerConfig` and applies it to `step` via
 * `.onTargetEvent()`, once per event name (mirroring the builder's own multi-event handling).
 * @param step The step builder to apply the handler to.
 * @param handler The config-form event handler.
 * @param path Error path for this handler.
 */
function applyEventHandler<T>(
  step: WorkflowStepBuilder<T>,
  handler: EventHandlerConfig<T>,
  path: string,
): void {
  const action = resolveEventHandlerAction(handler.action, `${path}.action`);
  const events = typeof handler.event === "string" ? [handler.event] : handler.event;
  for (const event of events) {
    step.onTargetEvent(event, async (_event, context) => {
      await action(context);
    });
  }
}

/**
 * Resolves a `StepActionRef<T>` into a plain `StepAction<T>`, for use as an `onTargetEvent`
 * callback body. An inline function is returned as-is; a `BuiltinAction` is converted via a
 * throwaway `WorkflowBuilder<string>` step so the actual builder verb produces the instruction —
 * this reuses the builder's own validation and polling/timeout logic instead of reimplementing
 * it. The scratch builder is always `<string>`: `BuiltinAction` carries no content, and none of
 * the resulting callbacks (`wait`, `waitUntilElement`, `clickTarget`, `focusTarget`) read
 * `context.props` — they only touch `target`/`signal` — so the cast back to `StepAction<T>` is
 * safe regardless of what `T` actually is.
 * @param ref The action ref to resolve.
 * @param path Error path for this ref, used if resolution fails at build time.
 */
function resolveEventHandlerAction<T>(ref: StepActionRef<T>, path: string): StepAction<T> {
  if (typeof ref === "function") return ref;

  const scratch = new WorkflowBuilder<string>("__config_event_handler_scratch__");
  const scratchStep = scratch.step({ target: "*", title: "", content: "" });
  applyBuiltinAction(scratchStep, ref, path);
  const [instruction] = scratch.build().steps[0]?.actions ?? [];
  if (instruction === undefined) {
    throw new Error(`Failed to resolve built-in action at ${path}`);
  }
  if (typeof instruction === "number") {
    const delayMs = instruction;
    return async (context) => {
      await abortableDelay(delayMs, context.signal);
      return true;
    };
  }
  return instruction as unknown as StepAction<T>;
}

/**
 * Recursively copies a config value into a frozen structure. Generic (rather than the shape-specific
 * freeze helpers in `../definition`) because `WorkflowConfig` mixes arbitrary JSON with live function
 * values (inline actions/hooks).
 *
 * Config containers (plain objects and arrays) are cloned before freezing so the caller's own config
 * object is never mutated. Rich `title`/`content` values, functions, and non-plain framework objects
 * are passed through by reference: cloning them would discard prototypes, internal slots, or cycles.
 * @param value The value to copy and freeze.
 */
function deepFreezeClone<T>(
  value: T,
  clones: WeakMap<object, object> = new WeakMap(),
  preserveReference = false,
): T {
  if (preserveReference) return value;
  if (Array.isArray(value)) {
    const existing = clones.get(value);
    if (existing) return existing as T;
    const clone: unknown[] = [];
    clones.set(value, clone);
    for (const entry of value) clone.push(deepFreezeClone(entry, clones));
    return Object.freeze(clone) as T;
  }
  if (value === null || typeof value !== "object") return value;

  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== null && prototype !== Object.prototype) return value;

  const existing = clones.get(value);
  if (existing) return existing as T;
  const clone = Object.create(prototype) as Record<string, unknown>;
  clones.set(value, clone);
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    clone[key] = deepFreezeClone(entry, clones, key === "title" || key === "content");
  }
  return Object.freeze(clone) as T;
}
